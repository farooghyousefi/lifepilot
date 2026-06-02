import Image from "next/image";
import { createLifePilotClient } from "@lifepilot/api-client";
import { Pill, StatTile } from "@lifepilot/ui";

const client = createLifePilotClient();

export default async function Home() {
  const snapshot = await client.getSnapshot();
  const goalsInFlight = snapshot.data.goals.length;
  const remindersOpen = snapshot.data.reminders.filter(
    (reminder) => !reminder.completed,
  ).length;

  return (
    <main className="min-h-screen">
      <section className="px-5 py-5 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-7xl items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-graphite text-sm font-bold text-white">
              LP
            </div>
            <span className="text-lg font-semibold">Life Pilot</span>
          </div>
          <a
            className="rounded-lg bg-graphite px-4 py-2 text-sm font-semibold text-white shadow-sm"
            href="#foundation"
          >
            View foundation
          </a>
        </nav>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-2xl">
            <Pill>AWS-first personal operating system</Pill>
            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-normal text-graphite sm:text-6xl">
              Life Pilot
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              A privacy-conscious foundation for goals, documents, reminders,
              and AI-assisted life admin. Built as a TypeScript monorepo with
              web, mobile, shared contracts, mock APIs, Lambdas, and CDK.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatTile label="Active goals" value={`${goalsInFlight}`} tone="mint" />
              <StatTile label="Open reminders" value={`${remindersOpen}`} tone="blue" />
              <StatTile
                label="Mock documents"
                value={`${snapshot.data.documents.length}`}
                tone="coral"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <Image
              src="/life-pilot-dashboard.png"
              alt="Life Pilot dashboard mockup"
              width={1400}
              height={900}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section id="foundation" className="border-t border-slate-200 bg-white px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            ["Identity", "Cognito-ready auth boundary with no real users."],
            ["Data", "DynamoDB tables prepared for goals, reminders, and documents."],
            ["Storage", "S3 document bucket architecture with placeholder Lambdas."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-lg border border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-graphite">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

