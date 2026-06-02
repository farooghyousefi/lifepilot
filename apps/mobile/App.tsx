import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { createLifePilotClient } from "@lifepilot/api-client";
import type { LifePilotSnapshot } from "@lifepilot/shared";

const client = createLifePilotClient();

export default function App() {
  const [snapshot, setSnapshot] = useState<LifePilotSnapshot | null>(null);

  useEffect(() => {
    void client.getSnapshot().then((result) => setSnapshot(result.data));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>Life Pilot</Text>
          <Text style={styles.subtitle}>
            Mobile skeleton for goals, documents, reminders, and AI insights.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Today</Text>
          <Text style={styles.metric}>
            {snapshot ? snapshot.reminders.length : 0} reminders
          </Text>
          <Text style={styles.muted}>Mock data only. No real user data loaded.</Text>
        </View>

        <View style={styles.grid}>
          {[
            ["Goals", snapshot?.goals.length ?? 0],
            ["Documents", snapshot?.documents.length ?? 0],
            ["Insights", 0],
            ["Contracts", 1],
          ].map(([label, value]) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.tileLabel}>{label}</Text>
              <Text style={styles.tileValue}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 24,
    gap: 18,
  },
  header: {
    paddingTop: 24,
    gap: 10,
  },
  brand: {
    color: "#17202a",
    fontSize: 38,
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
    fontSize: 17,
    lineHeight: 25,
  },
  panel: {
    backgroundColor: "#17202a",
    borderRadius: 8,
    padding: 20,
  },
  panelTitle: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: "600",
  },
  metric: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 10,
  },
  muted: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 16,
    width: "48%",
  },
  tileLabel: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  tileValue: {
    color: "#17202a",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 12,
  },
});

