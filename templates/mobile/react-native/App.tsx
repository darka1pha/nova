import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Card } from "./src/components/Card";
import { Button } from "./src/components/Button";
import { colors } from "./src/theme/colors";
import { typography } from "./src/theme/typography";

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [count, setCount] = useState(0);
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: currentColors.background }]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: currentColors.text }]}>
                Nova Mobile
              </Text>
              <Text style={[styles.subtitle, { color: currentColors.textMuted }]}>
                React Native + Expo Starter
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDark(!isDark)}
              style={[
                styles.themeToggle,
                { backgroundColor: currentColors.card, borderColor: currentColors.border },
              ]}
            >
              <Text style={{ color: currentColors.text, fontSize: 12 }}>
                {isDark ? "🌙 Dark" : "☀️ Light"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hero Card */}
          <Card dark={isDark} style={styles.heroCard}>
            <Text style={[styles.cardTitle, { color: currentColors.text }]}>
              🚀 Native Performance & DX
            </Text>
            <Text style={[styles.cardDescription, { color: currentColors.textMuted }]}>
              Cross-platform mobile application built with TypeScript, Expo SDK 52, New Architecture, and safe-area components.
            </Text>
            <View style={styles.heroActionRow}>
              <Button
                title={`Interactive Count: ${count}`}
                onPress={() => setCount(count + 1)}
                dark={isDark}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {/* Features Grid */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            Architecture Highlights
          </Text>

          <View style={styles.grid}>
            <Card dark={isDark} style={styles.featureCard}>
              <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                ⚡ Expo SDK 52
              </Text>
              <Text style={[styles.featureText, { color: currentColors.textMuted }]}>
                Hermes engine & React Native 0.76 with fast refresh.
              </Text>
            </Card>

            <Card dark={isDark} style={styles.featureCard}>
              <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                📱 Multi-Platform
              </Text>
              <Text style={[styles.featureText, { color: currentColors.textMuted }]}>
                Deploy simultaneously to iOS, Android, and Web.
              </Text>
            </Card>

            <Card dark={isDark} style={styles.featureCard}>
              <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                🛡️ TypeScript 5
              </Text>
              <Text style={[styles.featureText, { color: currentColors.textMuted }]}>
                Strict typing for components, themes, and API services.
              </Text>
            </Card>

            <Card dark={isDark} style={styles.featureCard}>
              <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                🎨 Design Tokens
              </Text>
              <Text style={[styles.featureText, { color: currentColors.textMuted }]}>
                Unified color palette and typography scales.
              </Text>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  themeToggle: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroCard: {
    marginBottom: 24,
  },
  cardTitle: {
    ...typography.h2,
  },
  cardDescription: {
    ...typography.body,
    marginTop: 8,
  },
  heroActionRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  featureCard: {
    padding: 14,
  },
  featureTitle: {
    ...typography.h3,
    fontSize: 15,
  },
  featureText: {
    ...typography.bodySmall,
    marginTop: 4,
  },
});
