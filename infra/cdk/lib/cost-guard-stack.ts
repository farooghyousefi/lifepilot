import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";

export class CostGuardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const budgetEmail = process.env.LIFEPILOT_BUDGET_EMAIL;

    if (!budgetEmail) {
      throw new Error(
        "Missing environment variable: LIFEPILOT_BUDGET_EMAIL. Set it before running cdk synth."
      );
    }

    const subscriber: budgets.CfnBudget.SubscriberProperty = {
      subscriptionType: "EMAIL",
      address: budgetEmail,
    };

    new budgets.CfnBudget(this, "LifePilotMonthlyBudget", {
      budget: {
        budgetName: "lifepilot-dev-monthly-budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: 5,
          unit: "USD",
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 50,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [subscriber],
        },
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [subscriber],
        },
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [subscriber],
        },
      ],
    });
  }
}