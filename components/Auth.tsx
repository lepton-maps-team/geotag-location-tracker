import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(trimmedUsername, password);
      const data = JSON.stringify({
        User_Name: trimmedUsername,
        Password: password,
        Fcm_Key:
          "AAAACY0Odmk:APA91bGgM9_BraffD7siQdQdpy7F3UXYSz-s9iNhTyuOlPMciv24UQU7e48PLZRKNIuz6APrSsTGhmiZpnFHEi4a7aFkXL1BbvdeiOY6aaVchoFtEGePp_1a0bIGLjeWmi_L29g73MQk",
      });
      const response = await axios.post(
        "https://networkaccess.st.leptonsoftware.com:8056/api/Video/LoginUser",
        {
          data,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login API Response:", response.data);

      const { Status, Message, Result } = response.data;
      console.log("Status", Status);
      if (response.data) {
        await AsyncStorage.setItem("user", JSON.stringify(response.data));
        setUsername("");
        setPassword("");
        router.replace("/");
      }

      if (Status !== "5006" || !Result) {
        setError(Message || "Invalid username or password.");
        return;
      }

      // Save the full response to AsyncStorage

      setUsername("");
      setPassword("");
    } catch (caughtError: any) {
      console.error("Login error:", caughtError);
      if (caughtError.response) {
        console.error("Response error:", caughtError.response.data);
        const errorMessage =
          caughtError.response.data?.Message ||
          "An unexpected error occurred. Please try again.";
        setError(errorMessage);
      } else if (caughtError.request) {
        console.error("Request error:", caughtError.request);
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [password, router, username]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Login</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                placeholder="Enter your username"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  placeholder="Your password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.input, styles.passwordInput]}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeButton}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
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
                <ActivityIndicator color="#111827" />
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
    backgroundColor: "black",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "black",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
  },
  form: {
    gap: 16,
    marginTop: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#9ca3af",
    fontSize: 14,
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
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  eyeText: {
    fontSize: 16,
    color: "#9ca3af",
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
    backgroundColor: "white",
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
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
});

export default Auth;
