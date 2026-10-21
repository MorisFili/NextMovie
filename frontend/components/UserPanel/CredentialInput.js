import { useState } from "react"
import {View, Text, TextInput, Pressable, StyleSheet} from "react-native"
import { mainTheme } from "../../layout/GlobalTheme"

export default function CredentialInput({onLogin, onSignUp}) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const canSubmit = username.trim().length > 0 && password.length > 0

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome</Text>

            <TextInput
                accessibilityLabel="Username"
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={mainTheme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                value={username}
                onChangeText={setUsername}
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    accessibilityLabel="Password"
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor={mainTheme.muted}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    value={password}
                    onChangeText={setPassword}
                />

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    onPress={() => setShowPassword(!showPassword)}
                >
                    <Text style={styles.showPassword}>
                        {showPassword ? "Hide" : "Show"}
                    </Text>
                </Pressable>
            </View>

            <Pressable
                accessibilityRole="button"
                style={[styles.loginButton, !canSubmit && styles.disabled]}
                disabled={!canSubmit}
                onPress={() => onLogin?.(username.trim(), password)}
            >
                <Text style={styles.loginText}>Sign in</Text>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                style={[styles.signUpButton, !canSubmit && styles.disabled]}
                disabled={!canSubmit}
                onPress={() => onSignUp?.(username.trim(), password)}
            >
                <Text style={styles.signUpText}>Sign up</Text>
            </Pressable>

            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
            </View>

            <Pressable style={styles.oauthButton} onPress={null}>
                <Text style={styles.oauthText}>Continue with Google</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        padding: 20,
        gap: 14
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: mainTheme.text,
        marginBottom: 8
    },
    input: {
        height: 48,
        backgroundColor: mainTheme.surface,
        borderRadius: 10,
        paddingHorizontal: 14,
        color: mainTheme.text,
        fontSize: 15
    },
    passwordContainer: {
        height: 48,
        backgroundColor: mainTheme.surface,
        borderRadius: 10,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center"
    },
    passwordInput: {
        flex: 1,
        color: mainTheme.text,
        fontSize: 15
    },
    showPassword: {
        color: mainTheme.accent,
        fontSize: 13,
        padding: 8
    },
    loginButton: {
        height: 48,
        backgroundColor: mainTheme.accent,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    disabled: {
        opacity: 0.4
    },
    loginText: {
        color: mainTheme.background,
        fontWeight: "700",
        fontSize: 15
    },
    signUpButton: {
        height: 48,
        borderWidth: 1,
        borderColor: mainTheme.accent,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    signUpText: {
        color: mainTheme.accent,
        fontWeight: "600",
        fontSize: 15
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: 4
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: mainTheme.muted
    },
    dividerText: {
        color: mainTheme.muted,
        fontSize: 12
    },
    oauthButton: {
        height: 48,
        borderWidth: 1,
        borderColor: mainTheme.muted,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    oauthText: {
        color: mainTheme.text,
        fontSize: 15,
        fontWeight: "600"
    }
})
