import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StandardSection, Datapoint, WorkflowStatus, Comment } from '../types';
import { isApiConfigured, updateDatapoint as patchDatapointRemote, addComment as addCommentRemote } from '../services/apiService';
import { recordAuditEvent } from '../services/auditLogService';
import { getActiveOrganizationId, getCurrentActorId } from '../services/dataPlane';
import { mergeCustomIntoSections, addCustomDatapointRecord } from '../services/customDatapointsStore';

interface SectionsContextType {
  sections: StandardSection[];
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  setSections: (sections: StandardSection[]) => void;
  updateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void;
  addDatapoint: (sectionId: string, datapoint: Datapoint) => void;
  addComment: (datapointId: string, comment: Comment) => void;
  addSection: (section: StandardSection) => void;
  updateSection: (sectionId: string, updates: Partial<StandardSection>) => void;
  getDatapointById: (datapointId: string) => Datapoint | undefined;
  getSectionById: (sectionId: string) => StandardSection | undefined;
}

const SectionsContext = createContext<SectionsContextType | undefined>(undefined);

interface SectionsProviderProps {
  children: ReactNode;
  initialSections?: StandardSection[];
  initialActiveSectionId?: string;
  /** Sincronización desde React Query / servidor */
  syncedSections?: StandardSection[] | null;
}

export const SectionsProvider: React.FC<SectionsProviderProps> = ({ 
  children, 
  initialSections = [],
  initialActiveSectionId,
  syncedSections
}) => {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<StandardSection[]>(() =>
    mergeCustomIntoSections(initialSections)
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(
    initialActiveSectionId || initialSections[0]?.id || ''
  );

  useEffect(() => {
    if (syncedSections == null) return;
    setSections(mergeCustomIntoSections(syncedSections));
    setActiveSectionId(prev => {
      if (syncedSections.length === 0) return prev;
      if (!syncedSections.some(s => s.id === prev)) {
        return syncedSections[0].id;
      }
      return prev;
    });
  }, [syncedSections]);

  const updateDatapoint = useCallback((datapointId: string, updates: Partial<Datapoint>) => {
    setSections(prevSections => 
      prevSections.map(section => ({
        ...section,
        datapoints: section.datapoints.map(dp => 
          dp.id === datapointId 
            ? { ...dp, ...updates, lastModified: new Date().toISOString() }
            : dp
        )
      }))
    );

    if (isApiConfigured()) {
      void patchDatapointRemote(datapointId, updates)
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: ['esg-sections', getActiveOrganizationId()],
          });
        })
        .catch(() => {});
    }
    void recordAuditEvent({
      actorUserId: getCurrentActorId(),
      action: 'update',
      resourceType: 'datapoint',
      resourceId: datapointId,
      details: { fields: Object.keys(updates) }
    });
  }, [queryClient]);

  const addComment = useCallback((datapointId: string, comment: Comment) => {
    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        datapoints: section.datapoints.map(dp =>
          dp.id === datapointId
            ? { ...dp, comments: [...(dp.comments || []), comment] }
            : dp
        )
      }))
    );

    if (isApiConfigured()) {
      void addCommentRemote(datapointId, {
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text
      })
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: ['esg-sections', getActiveOrganizationId()],
          });
        })
        .catch(() => {});
      void recordAuditEvent({
        actorUserId: comment.userId,
        actorName: comment.userName,
        action: 'comment',
        resourceType: 'datapoint',
        resourceId: datapointId,
        details: { textPreview: comment.text.slice(0, 120) }
      });
    }
  }, [queryClient]);

  const addDatapoint = useCallback((sectionId: string, datapoint: Datapoint) => {
    addCustomDatapointRecord(sectionId, datapoint);
    setSections(prevSections =>
      prevSections.map(section => {
        if (section.id !== sectionId) return section;
        if (section.datapoints.some(d => d.id === datapoint.id)) return section;
        return { ...section, datapoints: [...section.datapoints, datapoint] };
      })
    );
    void recordAuditEvent({
      actorUserId: getCurrentActorId(),
      action: 'create',
      resourceType: 'datapoint',
      resourceId: datapoint.id,
      details: { sectionId, code: datapoint.code, isCustom: datapoint.isCustom === true }
    });
  }, []);

  const addSection = useCallback((section: StandardSection) => {
    setSections(prevSections => [...prevSections, section]);
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<StandardSection>) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  }, []);

  const getDatapointById = useCallback((datapointId: string): Datapoint | undefined => {
    for (const section of sections) {
      const datapoint = section.datapoints.find(dp => dp.id === datapointId);
      if (datapoint) return datapoint;
    }
    return undefined;
  }, [sections]);

  const getSectionById = useCallback((sectionId: string): StandardSection | undefined => {
    return sections.find(s => s.id === sectionId);
  }, [sections]);

  const value: SectionsContextType = {
    sections,
    activeSectionId,
    setActiveSectionId,
    setSections,
    updateDatapoint,
    addDatapoint,
    addComment,
    addSection,
    updateSection,
    getDatapointById,
    getSectionById,
  };

  return (
    <SectionsContext.Provider value={value}>
      {children}
    </SectionsContext.Provider>
  );
};

export const useSections = (): SectionsContextType => {
  const context = useContext(SectionsContext);
  if (!context) {
    throw new Error('useSections must be used within a SectionsProvider');
  }
  return context;
};
