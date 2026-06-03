#!/usr/bin/env node

import { App } from "aws-cdk-lib";
import { LifePilotFoundationStack } from "../lib/lifepilot-foundation-stack";
import { CostGuardStack } from "../lib/cost-guard-stack";

const app = new App();

new LifePilotFoundationStack(app, "LifePilotFoundationStack", {
  description: "Life Pilot AWS-first foundation. Synth-only until explicitly deployed.",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-central-1",
  },
});

new CostGuardStack(app, "LifePilotCostGuardStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-central-1",
  },
});