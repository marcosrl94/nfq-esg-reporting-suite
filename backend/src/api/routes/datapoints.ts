/**
 * Datapoints API Routes
 */
import express, { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorization';
import { auditMiddleware } from '../../middleware/audit';
import { datapointService } from '../../services/datapointService';
import { User } from '../../models/User';

const router: Router = express.Router();

// GET /api/datapoints - Listar datapoints
router.get(
  '/',
  authenticate,
  authorize('datapoint', 'read'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { cycleId, status, department, standardCode } = req.query;

      const userModel: User = {
        id: req.user.id,
        organizationId: req.user.organizationId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role as any,
        department: req.user.department as any,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const datapoints = await datapointService.list({
        organizationId: req.user.organizationId,
        cycleId: cycleId as string,
        status: status as string,
        department: department as string,
        standardCode: standardCode as string,
        userId: req.user.id
      });

      res.json(datapoints);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/datapoints/:id - Obtener datapoint específico
router.get(
  '/:id',
  authenticate,
  authorize('datapoint', 'read'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const datapoint = await datapointService.getById(
        req.user.organizationId,
        id,
        req.user.id
      );

      if (!datapoint) {
        return res.status(404).json({ error: 'Datapoint not found' });
      }

      res.json(datapoint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/datapoints - Crear datapoint
router.post(
  '/',
  authenticate,
  authorize('datapoint', 'create'),
  auditMiddleware('datapoint', 'created'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userModel: User = {
        id: req.user.id,
        organizationId: req.user.organizationId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role as any,
        department: req.user.department as any,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const {
        cycleId,
        code,
        name,
        description,
        type,
        unit,
        baseUnit,
        department,
        requirementId,
        consolidationEnabled,
        consolidationMethod
      } = req.body;

      // Validar campos requeridos
      if (!cycleId || !code || !name || !type || !department) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['cycleId', 'code', 'name', 'type', 'department']
        });
      }

      const datapoint = await datapointService.create(
        {
          organizationId: req.user.organizationId,
          cycleId,
          code,
          name,
          description,
          type,
          unit,
          baseUnit,
          department,
          requirementId,
          consolidationEnabled,
          consolidationMethod,
          ownerId: req.user.id
        },
        userModel
      );

      // El middleware de auditoría capturará el evento
      req.auditContext = {
        afterState: datapoint as any
      };

      res.status(201).json(datapoint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/datapoints/:id - Actualizar datapoint
router.patch(
  '/:id',
  authenticate,
  authorize('datapoint', 'update'),
  auditMiddleware('datapoint', 'updated'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const updates = req.body;

      const userModel: User = {
        id: req.user.id,
        organizationId: req.user.organizationId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role as any,
        department: req.user.department as any,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Obtener estado anterior para auditoría
      const beforeState = await datapointService.getById(
        req.user.organizationId,
        id,
        req.user.id
      );

      if (!beforeState) {
        return res.status(404).json({ error: 'Datapoint not found' });
      }

      const datapoint = await datapointService.update(
        req.user.organizationId,
        id,
        updates,
        userModel
      );

      // El middleware de auditoría capturará el evento
      req.auditContext = {
        beforeState: beforeState as any,
        afterState: datapoint as any
      };

      res.json(datapoint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/datapoints/:id/approve - Aprobar datapoint
router.post(
  '/:id/approve',
  authenticate,
  authorize('datapoint', 'approve'),
  auditMiddleware('datapoint', 'approved'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { comments } = req.body;

      const datapoint = await datapointService.approve(
        req.user.organizationId,
        id,
        req.user.id,
        comments
      );

      req.auditContext = {
        afterState: datapoint as any
      };

      res.json(datapoint);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
