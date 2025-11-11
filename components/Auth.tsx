import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Username"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        editable={!loading}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        onPress={handleLogin}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
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
    color: "#b91c1c",
    textAlign: "center",
  },
});

export default Auth;
