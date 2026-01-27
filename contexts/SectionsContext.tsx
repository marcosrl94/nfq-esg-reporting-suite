import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StandardSection, Datapoint, WorkflowStatus, Comment } from '../types';

interface SectionsContextType {
  sections: StandardSection[];
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  updateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void;
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
}

export const SectionsProvider: React.FC<SectionsProviderProps> = ({ 
  children, 
  initialSections = [],
  initialActiveSectionId 
}) => {
  const [sections, setSections] = useState<StandardSection[]>(initialSections);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    initialActiveSectionId || initialSections[0]?.id || ''
  );

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
  }, []);

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
    updateDatapoint,
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
