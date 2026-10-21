import {ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, useWindowDimensions, View} from "react-native"
import {mainTheme} from "../../layout/GlobalTheme"
import {StyleSheet} from "react-native"
import {useRef, useState} from "react"
import Animated, {interpolate, useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated"
import CredentialInput from "./CredentialInput"
import {authenticate} from "../../data/APICalls"
import {getData} from "../../data/DataProvider"
import LoggedInView from "./LoggedInView"


export function UserPanel() {
    const iconRef = useRef(null)
    const [layout, setLayout] = useState(null)
    const [expanded, setExpanded] = useState(false)
    const progress = useSharedValue(0)
    const {loggedIn, completeLogin, logout} = getData()
    const [processingInteraction, setProcessingInteraction] = useState(false)

    const {width, height} = useWindowDimensions()

    const expandedWidth = width * 0.9
    const expandedHeight = Math.min(height - 80, 520)
    const expandedX = (width - expandedWidth) / 2
    const expandedY = 40

    const animatedStyle = useAnimatedStyle(() => ({
        left: interpolate(progress.value, [0, 1], [layout?.x ?? 0, expandedX]),
        top: interpolate(progress.value, [0, 1], [layout?.y ?? 0, expandedY]),
        width: interpolate(progress.value, [0, 1], [layout?.width ?? 0, expandedWidth]),
        height: interpolate(progress.value, [0, 1], [layout?.height ?? 0, expandedHeight]),
        opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
    }))


    const open = () => {
        setExpanded(true)
        progress.value = withTiming(1, {duration: 400})
    }

    const close = () => {
        progress.value = withTiming(0, {duration: 300})
        const timeout = setTimeout(() => {
            setExpanded(false)
        }, 300)

        return () => clearTimeout(timeout)
    }


    async function submit(action, username, password) {
        if (processingInteraction) return
        setProcessingInteraction(true)
        try {
            const data = await action(username, password)
            if (data) {
                await completeLogin(data)
                close()
            }
        } catch (error) {
            Alert.alert("Authentication failed", error.message)
        } finally {
            setProcessingInteraction(false)
        }
    }

    const onLogin = (username, password) => authenticate("login", username, password)
    const onSignUp = (username, password) => authenticate("register", username, password)

    async function signOut() {
        setProcessingInteraction(true)
        try {
            await logout()
            close()
        } catch (error) {
            Alert.alert("Logout failed", error.message)
        } finally {
            setProcessingInteraction(false)
        }
    }

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open account menu"
                onLayout={() => {
                    iconRef.current?.measureInWindow((x, y, width, height) => {
                        setLayout({x, y, width, height})
                    })

                }}
                ref={iconRef}
                onPress={open}>
                <Text style={styles.userButton}>☰</Text>
            </Pressable>
            <Modal
                visible={expanded}
                transparent
                animationType="none"
                onRequestClose={close}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close account menu"
                    style={StyleSheet.absoluteFill}
                    onPress={close}
                />
                <Animated.View style={[styles.expanded, animatedStyle]}>
                    {expanded && (
                        <KeyboardAvoidingView
                            style={{flex: 1}}
                            behavior={"padding"}
                        >
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                            >
                                {processingInteraction && (
                                    <ActivityIndicator
                                        color={mainTheme.accent}
                                        accessibilityLabel="Processing account request"
                                    />
                                )}
                                {loggedIn ? (
                                    <LoggedInView
                                        signOut={signOut}
                                        processingInteraction={processingInteraction}
                                        close={close}
                                    />
                                ) : (
                                    <View pointerEvents={processingInteraction ? "none" : "auto"}>
                                        <CredentialInput
                                            onLogin={(username, password) => submit(onLogin, username, password)}
                                            onSignUp={(username, password) => submit(onSignUp, username, password)}
                                        />
                                    </View>
                                )}
                            </ScrollView>
                        </KeyboardAvoidingView>
                    )}
                </Animated.View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    userButton: {
        fontSize: 30,
        color: mainTheme.text
    },
    expanded: {
        position: "absolute",
        backgroundColor: mainTheme.elevated,
        borderRadius: 15,
        padding: 15,
        elevation: 10,
    },
})
