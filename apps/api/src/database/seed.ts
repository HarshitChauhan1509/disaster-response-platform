import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../modules/auth/user.model.js';
import { Responder } from '../modules/responders/responder.model.js';
import { Incident } from '../modules/incidents/incident.model.js';
import { Resource } from '../modules/resources/resource.model.js';
import { calculatePriorityScore } from '../modules/incidents/incident.priority.js';
import { logger } from '../shared/logger/logger.js';

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB for database seeding...');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Responder.deleteMany({}),
      Incident.deleteMany({}),
      Resource.deleteMany({}),
    ]);

    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // 1. Create Users
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@santrionn.com',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      isActive: true,
    });

    const coordinator = await User.create({
      name: 'Priya Sharma (Incident Commander)',
      email: 'coordinator@santrionn.com',
      passwordHash: defaultPasswordHash,
      role: 'COORDINATOR',
      isActive: true,
    });

    const responderUser1 = await User.create({
      name: 'Dr. Rajesh Rao',
      email: 'responder.medical@santrionn.com',
      passwordHash: defaultPasswordHash,
      role: 'RESPONDER',
      isActive: true,
    });

    const responderUser2 = await User.create({
      name: 'Vikram Singh (Fire Captain)',
      email: 'responder.fire@santrionn.com',
      passwordHash: defaultPasswordHash,
      role: 'RESPONDER',
      isActive: true,
    });

    const responderUser3 = await User.create({
      name: 'Ananya Deshmukh (Rescue Engineer)',
      email: 'responder.engineer@santrionn.com',
      passwordHash: defaultPasswordHash,
      role: 'RESPONDER',
      isActive: true,
    });

    // 2. Create Responders
    await Responder.create([
      {
        userId: responderUser1._id,
        skills: ['MEDICAL', 'WATER_RESCUE'],
        status: 'AVAILABLE',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716], // Bangalore Central
        },
        organization: 'National Disaster Response Force (NDRF)',
      },
      {
        userId: responderUser2._id,
        skills: ['FIRE', 'SEARCH_AND_RESCUE'],
        status: 'AVAILABLE',
        location: {
          type: 'Point',
          coordinates: [77.6033, 12.9784],
        },
        organization: 'State Fire & Emergency Services',
      },
      {
        userId: responderUser3._id,
        skills: ['ENGINEERING', 'DRIVER'],
        status: 'AVAILABLE',
        location: {
          type: 'Point',
          coordinates: [77.5806, 12.9698],
        },
        organization: 'Civil Engineering Disaster Taskforce',
      },
    ]);

    // 3. Create Sample Incidents
    const inc1Priority = calculatePriorityScore({
      severity: 'CRITICAL',
      affectedPeople: 450,
      requiredSkills: ['WATER_RESCUE', 'MEDICAL'],
      type: 'FLOOD',
    });

    const inc2Priority = calculatePriorityScore({
      severity: 'HIGH',
      affectedPeople: 85,
      requiredSkills: ['FIRE', 'SEARCH_AND_RESCUE'],
      type: 'FIRE',
    });

    const inc3Priority = calculatePriorityScore({
      severity: 'MEDIUM',
      affectedPeople: 20,
      requiredSkills: ['ENGINEERING', 'SEARCH_AND_RESCUE'],
      type: 'BUILDING_COLLAPSE',
    });

    await Incident.create([
      {
        title: 'Severe Urban Inundation - Riverside Colony',
        description:
          'Flash floods breaching the eastern embankment. Water levels rising rapidly, trapping residents on upper floors.',
        type: 'FLOOD',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        affectedPeople: 450,
        location: {
          type: 'Point',
          coordinates: [77.595, 12.972],
        },
        address: 'Riverside Enclave, Sector 4, Bangalore East',
        requiredSkills: ['WATER_RESCUE', 'MEDICAL'],
        priorityScore: inc1Priority,
        reportedBy: coordinator._id,
        timeline: [
          {
            eventType: 'INCIDENT_CREATED',
            actorId: coordinator._id.toString(),
            message: 'Incident reported by emergency dispatch unit',
            metadata: { severity: 'CRITICAL', priorityScore: inc1Priority },
            createdAt: new Date(Date.now() - 3600000 * 2),
          },
          {
            eventType: 'STATUS_CHANGED',
            actorId: coordinator._id.toString(),
            message: 'Incident verified on-site by field observer',
            metadata: { oldStatus: 'REPORTED', newStatus: 'VERIFIED' },
            createdAt: new Date(Date.now() - 3600000 * 1.5),
          },
          {
            eventType: 'STATUS_CHANGED',
            actorId: coordinator._id.toString(),
            message: 'Incident elevated to ACTIVE response operations',
            metadata: { oldStatus: 'VERIFIED', newStatus: 'ACTIVE' },
            createdAt: new Date(Date.now() - 3600000 * 1),
          },
        ],
      },
      {
        title: 'Commercial Chemical Warehouse Blaze',
        description:
          'Three-alarm chemical warehouse fire with toxic fume dispersion. Secondary explosions detected.',
        type: 'FIRE',
        severity: 'HIGH',
        status: 'VERIFIED',
        affectedPeople: 85,
        location: {
          type: 'Point',
          coordinates: [77.61, 12.98],
        },
        address: 'Industrial Plot 42, Outer Ring Road, Bangalore',
        requiredSkills: ['FIRE', 'SEARCH_AND_RESCUE'],
        priorityScore: inc2Priority,
        reportedBy: coordinator._id,
        timeline: [
          {
            eventType: 'INCIDENT_CREATED',
            actorId: coordinator._id.toString(),
            message: 'Incident reported via fire alarm telemetry',
            metadata: { severity: 'HIGH', priorityScore: inc2Priority },
            createdAt: new Date(Date.now() - 1800000),
          },
          {
            eventType: 'STATUS_CHANGED',
            actorId: coordinator._id.toString(),
            message: 'Incident verified by central dispatch',
            metadata: { oldStatus: 'REPORTED', newStatus: 'VERIFIED' },
            createdAt: new Date(Date.now() - 900000),
          },
        ],
      },
      {
        title: 'Old Commercial Complex Structural Failure',
        description:
          'Partial collapse of basement pillars in a 4-storey commercial shopping complex. Structural stabilization needed.',
        type: 'BUILDING_COLLAPSE',
        severity: 'MEDIUM',
        status: 'REPORTED',
        affectedPeople: 20,
        location: {
          type: 'Point',
          coordinates: [77.58, 12.96],
        },
        address: 'MG Road Junction, Commercial District, Bangalore',
        requiredSkills: ['ENGINEERING', 'SEARCH_AND_RESCUE'],
        priorityScore: inc3Priority,
        reportedBy: admin._id,
        timeline: [
          {
            eventType: 'INCIDENT_CREATED',
            actorId: admin._id.toString(),
            message: 'Incident reported by structural inspectors',
            metadata: { severity: 'MEDIUM', priorityScore: inc3Priority },
            createdAt: new Date(),
          },
        ],
      },
    ]);

    // 4. Create Sample Resources
    await Resource.create([
      {
        name: 'Emergency Trauma & Surgical Field Kits',
        type: 'MEDICAL',
        totalQuantity: 150,
        availableQuantity: 150,
        unit: 'kits',
        location: {
          type: 'Point',
          coordinates: [77.59, 12.97],
        },
        status: 'AVAILABLE',
      },
      {
        name: 'High-Capacity Inflatable Rescue Boats (Zodiac 8-person)',
        type: 'VEHICLE',
        totalQuantity: 12,
        availableQuantity: 12,
        unit: 'boats',
        location: {
          type: 'Point',
          coordinates: [77.585, 12.965],
        },
        status: 'AVAILABLE',
      },
      {
        name: 'Purified Drinking Water Rations (20L Jerry Cans)',
        type: 'WATER',
        totalQuantity: 2000,
        availableQuantity: 1850,
        unit: 'cans',
        location: {
          type: 'Point',
          coordinates: [77.6, 12.975],
        },
        status: 'AVAILABLE',
      },
      {
        name: 'Rapid Deployment All-Weather Family Shelter Tents',
        type: 'SHELTER',
        totalQuantity: 80,
        availableQuantity: 15,
        unit: 'tents',
        location: {
          type: 'Point',
          coordinates: [77.62, 12.95],
        },
        status: 'LOW',
      },
      {
        name: 'Heavy Duty Structural Debris Hydraulic Cutters',
        type: 'EQUIPMENT',
        totalQuantity: 8,
        availableQuantity: 8,
        unit: 'units',
        location: {
          type: 'Point',
          coordinates: [77.58, 12.97],
        },
        status: 'AVAILABLE',
      },
    ]);

    logger.info('Database seeded successfully!');
    logger.info('Credentials:');
    logger.info('  Admin:       admin@santrionn.com / Password123!');
    logger.info('  Coordinator: coordinator@santrionn.com / Password123!');
    logger.info('  Responder 1: responder.medical@santrionn.com / Password123!');
    logger.info('  Responder 2: responder.fire@santrionn.com / Password123!');
    logger.info('  Responder 3: responder.engineer@santrionn.com / Password123!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    process.exit(1);
  }
}

seed();
