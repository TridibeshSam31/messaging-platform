import {safeParse, z} from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  JWT_ACCESS_SECRET: z.string().min(8, "JWT_ACCESS_SECRET must be at least 8 characters"),
  JWT_REFRESH_SECRET: z.string().min(8, "JWT_REFRESH_SECRET must be at least 8 characters"),
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid frontend URL")
})

const parsedEnv = envSchema.safeParse(process.env)

if(!parsedEnv.success){
    console.error("env is not correct")
}

export const env = parsedEnv.data