const Joi = require('joi');
const ApiError = require('../exceptions/ApiError');

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
    role: Joi.string().valid('GENERAL_USER', 'HOSPITAL_ADMIN')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin
}; 