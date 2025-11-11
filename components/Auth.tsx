import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Auth = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("username", trimmedUsername)
        .eq("password", password)
        .single();

      if (supabaseError) {
        if (
          supabaseError.code === "PGRST116" ||
          supabaseError.message?.includes("No rows")
        ) {
          setError("Invalid username or password.");
        } else {
          console.error("Supabase login error:", supabaseError);
          setError("An unexpected error occurred. Please try again.");
        }
        return;
      }

      if (!data || data.password !== password) {
        setError("Invalid username or password.");
        return;
      }

      setUsername("");
      setPassword("");
      AsyncStorage.setItem("user", JSON.stringify(data));
      router.replace("/");
    } catch (caughtError) {
      console.error("Login error:", caughtError);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [password, router, username]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>
              Sign in to continue tracking field locations for your projects.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>
            <View style={styles.inputs}>
              <TextInput
                placeholder="Username"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                editable={!loading}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                editable={!loading}
              />
            </View>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
  },
  hero: {
    gap: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 18,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  inputs: {
    gap: 14,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 16, default: 14 }),
    fontSize: 16,
    color: "#e2e8f0",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  errorBanner: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
});

export default Auth;
