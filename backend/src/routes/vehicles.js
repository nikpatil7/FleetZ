import express from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignVehicle,
  releaseVehicle,
  updateVehicleLocation,
  updateVehicleOdometer,
  addMaintenance,
  getAvailableVehicles,
  getVehiclesNearLocation,
  getVehiclesNeedingMaintenance,
  getVehiclesWithExpiredDocuments,
  getVehicleStats
} from '../controllers/vehicleController.js';

const router = express.Router();

// Validation schemas
const createVehicleSchema = Joi.object({
  vehicleNumber: Joi.string().pattern(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/).required(),
  type: Joi.string().valid('bike', 'scooter', 'car', 'van', 'truck', 'cycle').required(),
  make: Joi.string().required(),
  model: Joi.string().required(),
  year: Joi.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: Joi.string().optional(),
  capacity: Joi.number().min(0).optional(),
  maxWeight: Joi.number().min(0).optional(),
  fuelType: Joi.string().valid('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg').optional(),
  features: Joi.array().items(
    Joi.string().valid('gps', 'camera', 'alarm', 'air_conditioning', 'power_steering', 'abs', 'airbag')
  ).optional(),
  insurance: Joi.object({
    policyNumber: Joi.string().optional(),
    provider: Joi.string().optional(),
    expiryDate: Joi.date().optional(),
    isActive: Joi.boolean().optional()
  }).optional(),
  registration: Joi.object({
    number: Joi.string().optional(),
    expiryDate: Joi.date().optional(),
    isActive: Joi.boolean().optional()
  }).optional(),
  notes: Joi.string().optional()
});

const updateVehicleSchema = Joi.object({
  make: Joi.string().optional(),
  model: Joi.string().optional(),
  year: Joi.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: Joi.string().optional(),
  capacity: Joi.number().min(0).optional(),
  maxWeight: Joi.number().min(0).optional(),
  fuelType: Joi.string().valid('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg').optional(),
  status: Joi.string().valid('available', 'in_use', 'maintenance', 'out_of_service').optional(),
  isActive: Joi.boolean().optional(),
  trackingEnabled: Joi.boolean().optional(),
  insurance: Joi.object({
    policyNumber: Joi.string().optional(),
    provider: Joi.string().optional(),
    expiryDate: Joi.date().optional(),
    isActive: Joi.boolean().optional()
  }).optional(),
  registration: Joi.object({
    number: Joi.string().optional(),
    expiryDate: Joi.date().optional(),
    isActive: Joi.boolean().optional()
  }).optional(),
  features: Joi.array().items(
    Joi.string().valid('gps', 'camera', 'alarm', 'air_conditioning', 'power_steering', 'abs', 'airbag')
  ).optional(),
  notes: Joi.string().optional()
});

const assignVehicleSchema = Joi.object({
  driverId: Joi.string().required()
});

const updateLocationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().optional()
});

const updateOdometerSchema = Joi.object({
  reading: Joi.number().min(0).required()
});

const addMaintenanceSchema = Joi.object({
  type: Joi.string().required(),
  description: Joi.string().optional(),
  cost: Joi.number().min(0).optional(),
  odometer: Joi.number().min(0).optional(),
  nextDue: Joi.date().optional()
});

// Routes
// @route   GET /api/vehicles
// @desc    Get all vehicles
// @access  Private (Admin, Manager)
router.get('/', authenticate, authorize(['admin', 'manager']), getVehicles);

// @route   GET /api/vehicles/available
// @desc    Get available vehicles
// @access  Private (Admin, Manager)
router.get('/available', authenticate, authorize(['admin', 'manager']), getAvailableVehicles);

// @route   GET /api/vehicles/near
// @desc    Get vehicles near location
// @access  Private (Admin, Manager)
router.get('/near', authenticate, authorize(['admin', 'manager']), getVehiclesNearLocation);

// @route   GET /api/vehicles/maintenance
// @desc    Get vehicles needing maintenance
// @access  Private (Admin, Manager)
router.get('/maintenance', authenticate, authorize(['admin', 'manager']), getVehiclesNeedingMaintenance);

// @route   GET /api/vehicles/expired-documents
// @desc    Get vehicles with expired documents
// @access  Private (Admin, Manager)
router.get('/expired-documents', authenticate, authorize(['admin', 'manager']), getVehiclesWithExpiredDocuments);

// @route   GET /api/vehicles/stats
// @desc    Get vehicle statistics
// @access  Private (Admin, Manager)
router.get('/stats', authenticate, authorize(['admin', 'manager']), getVehicleStats);

// @route   GET /api/vehicles/:id
// @desc    Get vehicle by ID
// @access  Private
router.get('/:id', authenticate, getVehicleById);

// @route   POST /api/vehicles
// @desc    Create new vehicle
// @access  Private (Admin)
router.post('/', authenticate, authorize(['admin']), validate(createVehicleSchema), createVehicle);

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle
// @access  Private (Admin)
router.put('/:id', authenticate, authorize(['admin']), validate(updateVehicleSchema), updateVehicle);

// @route   PUT /api/vehicles/:id/assign
// @desc    Assign vehicle to driver
// @access  Private (Admin, Manager)
router.put('/:id/assign', authenticate, authorize(['admin', 'manager']), validate(assignVehicleSchema), assignVehicle);

// @route   PUT /api/vehicles/:id/release
// @desc    Release vehicle from driver
// @access  Private (Admin, Manager)
router.put('/:id/release', authenticate, authorize(['admin', 'manager']), releaseVehicle);

// @route   PUT /api/vehicles/:id/location
// @desc    Update vehicle location
// @access  Private
router.put('/:id/location', authenticate, validate(updateLocationSchema), updateVehicleLocation);

// @route   PUT /api/vehicles/:id/odometer
// @desc    Update vehicle odometer
// @access  Private
router.put('/:id/odometer', authenticate, validate(updateOdometerSchema), updateVehicleOdometer);

// @route   POST /api/vehicles/:id/maintenance
// @desc    Add maintenance record
// @access  Private (Admin, Manager)
router.post('/:id/maintenance', authenticate, authorize(['admin', 'manager']), validate(addMaintenanceSchema), addMaintenance);

// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize(['admin']), deleteVehicle);

export default router;