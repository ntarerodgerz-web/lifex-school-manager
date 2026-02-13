const Joi = require('joi');

const createPupilSchema = Joi.object({
  // ─── Personal Information ───
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  other_names: Joi.string().max(100).allow('', null),
  gender: Joi.string().valid('Male', 'Female').optional(),
  date_of_birth: Joi.date().iso().optional(),
  nationality: Joi.string().max(50).allow('', null),
  religion: Joi.string().max(50).allow('', null),

  // ─── School / Class ───
  admission_number: Joi.string().max(50).allow('', null),
  class_id: Joi.string().uuid().allow(null, ''),
  enrollment_type: Joi.string().valid('new', 'transfer', 'repeating').allow('', null),
  is_boarding: Joi.boolean().allow(null),

  // ─── Contact & Residence ───
  address: Joi.string().allow('', null),
  district: Joi.string().max(100).allow('', null),

  // ─── Previous School ───
  previous_school: Joi.string().max(255).allow('', null),
  previous_class: Joi.string().max(100).allow('', null),
  reason_for_leaving: Joi.string().allow('', null),

  // ─── Health & Medical ───
  medical_notes: Joi.string().allow('', null),
  blood_group: Joi.string().max(5).allow('', null),
  allergies: Joi.string().allow('', null),
  disabilities: Joi.string().allow('', null),

  // ─── Emergency Contact ───
  emergency_contact_name: Joi.string().max(200).allow('', null),
  emergency_contact_phone: Joi.string().max(30).allow('', null),
  emergency_contact_relationship: Joi.string().max(50).allow('', null),

  // ─── Misc ───
  photo_url: Joi.string().uri().allow('', null),
  parent_id: Joi.string().uuid().allow(null, ''),
});

const updatePupilSchema = Joi.object({
  first_name: Joi.string().min(1).max(100),
  last_name: Joi.string().min(1).max(100),
  other_names: Joi.string().max(100).allow('', null),
  gender: Joi.string().valid('Male', 'Female'),
  date_of_birth: Joi.date().iso(),
  nationality: Joi.string().max(50).allow('', null),
  religion: Joi.string().max(50).allow('', null),
  admission_number: Joi.string().max(50).allow('', null),
  class_id: Joi.string().uuid().allow(null, ''),
  enrollment_type: Joi.string().valid('new', 'transfer', 'repeating').allow('', null),
  is_boarding: Joi.boolean().allow(null),
  address: Joi.string().allow('', null),
  district: Joi.string().max(100).allow('', null),
  previous_school: Joi.string().max(255).allow('', null),
  previous_class: Joi.string().max(100).allow('', null),
  reason_for_leaving: Joi.string().allow('', null),
  medical_notes: Joi.string().allow('', null),
  blood_group: Joi.string().max(5).allow('', null),
  allergies: Joi.string().allow('', null),
  disabilities: Joi.string().allow('', null),
  emergency_contact_name: Joi.string().max(200).allow('', null),
  emergency_contact_phone: Joi.string().max(30).allow('', null),
  emergency_contact_relationship: Joi.string().max(50).allow('', null),
  photo_url: Joi.string().uri().allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createPupilSchema, updatePupilSchema };
