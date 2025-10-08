import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import httpStatus from 'http-status';

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private (Admin, Manager)
export const getVehicles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, status, isActive, search } = req.query;
  const { skip, limit: limitNum } = getPagination(page, limit);

  // Build filter
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { vehicleNumber: { $regex: search, $options: 'i' } },
      { make: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } }
    ];
  }

  const vehicles = await Vehicle.find(filter)
    .populate('currentDriver', 'name phone email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Vehicle.countDocuments(filter);
  const pagination = getPaginationMeta(page, limitNum, total);

  paginatedResponse(res, vehicles, pagination, 'Vehicles retrieved successfully', httpStatus.OK);
});

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('currentDriver', 'name phone email');
  
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  successResponse(res, vehicle, 'Vehicle retrieved successfully', httpStatus.OK);
});

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (Admin)
export const createVehicle = asyncHandler(async (req, res) => {
  const {
    vehicleNumber,
    type,
    make,
    model,
    year,
    color,
    capacity,
    maxWeight,
    fuelType,
    features,
    insurance,
    registration,
    notes
  } = req.body;

  // Check if vehicle number already exists
  const existingVehicle = await Vehicle.findOne({ vehicleNumber });
  if (existingVehicle) {
    return errorResponse(res, 'Vehicle with this number already exists', httpStatus.CONFLICT);
  }

  const vehicle = new Vehicle({
    vehicleNumber,
    type,
    make,
    model,
    year,
    color,
    capacity,
    maxWeight,
    fuelType,
    features,
    insurance,
    registration,
    notes
  });

  await vehicle.save();

  const populatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('currentDriver', 'name phone email');

  successResponse(res, populatedVehicle, 'Vehicle created successfully', httpStatus.CREATED);
});

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Admin)
export const updateVehicle = asyncHandler(async (req, res) => {
  const {
    make,
    model,
    year,
    color,
    capacity,
    maxWeight,
    fuelType,
    status,
    isActive,
    trackingEnabled,
    insurance,
    registration,
    features,
    notes
  } = req.body;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  // Update fields
  if (make) vehicle.make = make;
  if (model) vehicle.model = model;
  if (year) vehicle.year = year;
  if (color) vehicle.color = color;
  if (capacity !== undefined) vehicle.capacity = capacity;
  if (maxWeight !== undefined) vehicle.maxWeight = maxWeight;
  if (fuelType) vehicle.fuelType = fuelType;
  if (status) vehicle.status = status;
  if (isActive !== undefined) vehicle.isActive = isActive;
  if (trackingEnabled !== undefined) vehicle.trackingEnabled = trackingEnabled;
  if (insurance) vehicle.insurance = { ...vehicle.insurance, ...insurance };
  if (registration) vehicle.registration = { ...vehicle.registration, ...registration };
  if (features) vehicle.features = features;
  if (notes) vehicle.notes = notes;

  await vehicle.save();

  const populatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('currentDriver', 'name phone email');

  successResponse(res, populatedVehicle, 'Vehicle updated successfully', httpStatus.OK);
});

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin)
export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  // Check if vehicle is currently in use
  if (vehicle.currentDriver) {
    return errorResponse(res, 'Cannot delete vehicle that is currently assigned to a driver', httpStatus.BAD_REQUEST);
  }

  // Soft delete by deactivating
  vehicle.isActive = false;
  vehicle.status = 'out_of_service';
  await vehicle.save();

  successResponse(res, null, 'Vehicle deactivated successfully', httpStatus.OK);
});

// @desc    Assign vehicle to driver
// @route   PUT /api/vehicles/:id/assign
// @access  Private (Admin, Manager)
export const assignVehicle = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return errorResponse(res, 'Driver ID is required', httpStatus.BAD_REQUEST);
  }

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  if (!vehicle.isActive) {
    return errorResponse(res, 'Vehicle is not active', httpStatus.BAD_REQUEST);
  }

  if (vehicle.status !== 'available') {
    return errorResponse(res, 'Vehicle is not available', httpStatus.BAD_REQUEST);
  }

  // Check if driver exists and is available
  const driver = await User.findById(driverId);
  if (!driver || driver.role !== 'driver' || !driver.isActive) {
    return errorResponse(res, 'Invalid driver', httpStatus.BAD_REQUEST);
  }

  // Check if driver already has a vehicle assigned
  const existingVehicle = await Vehicle.findOne({ currentDriver: driverId, isActive: true });
  if (existingVehicle) {
    return errorResponse(res, 'Driver already has a vehicle assigned', httpStatus.BAD_REQUEST);
  }

  // Assign vehicle to driver
  await vehicle.assignDriver(driverId);

  const populatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('currentDriver', 'name phone email');

  successResponse(res, populatedVehicle, 'Vehicle assigned successfully', httpStatus.OK);
});

// @desc    Release vehicle from driver
// @route   PUT /api/vehicles/:id/release
// @access  Private (Admin, Manager)
export const releaseVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  if (!vehicle.currentDriver) {
    return errorResponse(res, 'Vehicle is not assigned to any driver', httpStatus.BAD_REQUEST);
  }

  // Release vehicle
  await vehicle.releaseDriver();

  const populatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('currentDriver', 'name phone email');

  successResponse(res, populatedVehicle, 'Vehicle released successfully', httpStatus.OK);
});

// @desc    Update vehicle location
// @route   PUT /api/vehicles/:id/location
// @access  Private
export const updateVehicleLocation = asyncHandler(async (req, res) => {
  const { lat, lng, address } = req.body;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  // Update location
  await vehicle.updateLocation(lat, lng, address);

  successResponse(res, { lat, lng, address }, 'Vehicle location updated successfully', httpStatus.OK);
});

// @desc    Update vehicle odometer
// @route   PUT /api/vehicles/:id/odometer
// @access  Private
export const updateVehicleOdometer = asyncHandler(async (req, res) => {
  const { reading } = req.body;

  if (reading < 0) {
    return errorResponse(res, 'Odometer reading cannot be negative', httpStatus.BAD_REQUEST);
  }

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  await vehicle.updateOdometer(reading);

  successResponse(res, { odometer: vehicle.odometer }, 'Odometer updated successfully', httpStatus.OK);
});

// @desc    Add maintenance record
// @route   POST /api/vehicles/:id/maintenance
// @access  Private (Admin, Manager)
export const addMaintenance = asyncHandler(async (req, res) => {
  const { type, description, cost, odometer, nextDue } = req.body;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return errorResponse(res, 'Vehicle not found', httpStatus.NOT_FOUND);
  }

  const maintenanceData = {
    type,
    description,
    cost: cost || 0,
    odometer: odometer || vehicle.odometer.current,
    nextDue
  };

  await vehicle.addMaintenance(maintenanceData);

  const updatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('currentDriver', 'name phone email');

  successResponse(res, updatedVehicle, 'Maintenance record added successfully', httpStatus.CREATED);
});

// @desc    Get available vehicles
// @route   GET /api/vehicles/available
// @access  Private (Admin, Manager)
export const getAvailableVehicles = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let filter = { isActive: true, status: 'available', trackingEnabled: true };
  if (type) filter.type = type;

  const vehicles = await Vehicle.find(filter)
    .populate('currentDriver', 'name phone email')
    .sort({ type: 1, make: 1 });

  successResponse(res, vehicles, 'Available vehicles retrieved successfully', httpStatus.OK);
});

// @desc    Get vehicles near location
// @route   GET /api/vehicles/near
// @access  Private (Admin, Manager)
export const getVehiclesNearLocation = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, type } = req.query;

  if (!lat || !lng) {
    return errorResponse(res, 'Latitude and longitude are required', httpStatus.BAD_REQUEST);
  }

  const vehicles = await Vehicle.findNearLocation(parseFloat(lat), parseFloat(lng), parseFloat(radius), type);

  successResponse(res, vehicles, 'Nearby vehicles retrieved successfully', httpStatus.OK);
});

// @desc    Get vehicles needing maintenance
// @route   GET /api/vehicles/maintenance
// @access  Private (Admin, Manager)
export const getVehiclesNeedingMaintenance = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.findNeedingMaintenance()
    .populate('currentDriver', 'name phone email')
    .sort({ 'odometer.current': -1 });

  successResponse(res, vehicles, 'Vehicles needing maintenance retrieved successfully', httpStatus.OK);
});

// @desc    Get vehicles with expired documents
// @route   GET /api/vehicles/expired-documents
// @access  Private (Admin, Manager)
export const getVehiclesWithExpiredDocuments = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.findWithExpiredDocuments()
    .populate('currentDriver', 'name phone email')
    .sort({ 'insurance.expiryDate': 1 });

  successResponse(res, vehicles, 'Vehicles with expired documents retrieved successfully', httpStatus.OK);
});

// @desc    Get vehicle statistics
// @route   GET /api/vehicles/stats
// @access  Private (Admin, Manager)
export const getVehicleStats = asyncHandler(async (req, res) => {
  const totalVehicles = await Vehicle.countDocuments({ isActive: true });
  const availableVehicles = await Vehicle.countDocuments({ isActive: true, status: 'available' });
  const inUseVehicles = await Vehicle.countDocuments({ isActive: true, status: 'in_use' });
  const maintenanceVehicles = await Vehicle.countDocuments({ isActive: true, status: 'maintenance' });
  const outOfServiceVehicles = await Vehicle.countDocuments({ isActive: true, status: 'out_of_service' });

  const stats = {
    total: totalVehicles,
    available: availableVehicles,
    inUse: inUseVehicles,
    maintenance: maintenanceVehicles,
    outOfService: outOfServiceVehicles,
    utilizationRate: totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0
  };

  successResponse(res, stats, 'Vehicle statistics retrieved successfully', httpStatus.OK);
});