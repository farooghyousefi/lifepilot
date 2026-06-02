#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { LifePilotFoundationStack } from "../lib/lifepilot-foundation-stack";

const app = new App();

new LifePilotFoundationStack(app, "LifePilotFoundationStack", {
  description: "Life Pilot AWS-first foundation. Synth-only until explicitly deployed.",
});

