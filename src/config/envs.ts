import "dotenv/config";
import * as joi from "joi";
import * as process from "process";

interface EnvVars {
  PORT: number;
  SUCCESS_URL: string
  CANCEL_URL: string;
  STRIPE_SECRET: string;
  STRIPE_PROD_SECRET: string;
}

const envsSchema = joi.object({
  PORT: joi.number().required(),
  SUCCESS_URL: joi.string().required(),
  CANCEL_URL: joi.string().required(),
  STRIPE_SECRET: joi.string().required(),
  STRIPE_PROD_SECRET: joi.string().required(),
}).unknown(true);

const { error, value } = envsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  successUrl: envVars.SUCCESS_URL,
  cancelUrl: envVars.CANCEL_URL,
  stripeSecret: envVars.STRIPE_SECRET,
  stripeProdSecret: envVars.STRIPE_PROD_SECRET
};


