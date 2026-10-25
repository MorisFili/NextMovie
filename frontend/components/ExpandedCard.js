import {Alert, BackHandler, Linking, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions} from "react-native"
import {useEffect, useState} from "react"
import Animated, {interpolate, useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated"
import Trailer from "./Trailer"
import {mainTheme} from "../layout/GlobalTheme"

export default function ExpandedCard({movie, onClose, layout}) {

    const {width, height} = useWindowDimensions()

    const progress = useSharedValue(0)
    const [expanded, setExpanded] = useState(false)

    const expandedWidth = width * 0.9
    const expandedHeight = height * 0.75
    const expandedX = (width - expandedWidth) / 2
    const expandedY = (height - expandedHeight) / 2

    const animatedStyle = useAnimatedStyle(() => ({
        left: interpolate(progress.value, [0, 1], [layout.x, expandedX]),
        top: interpolate(progress.value, [0, 1], [layout.y, expandedY]),
        width: interpolate(progress.value, [0, 1], [layout.width, expandedWidth]),
        height: interpolate(progress.value, [0, 1], [layout.height, expandedHeight]),
        opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
    }))

    useEffect(() => {
        progress.value = withTiming(1, {duration: 400})

        const timeout = setTimeout(() => {
            setExpanded(true)
        }, 350)

        return () => clearTimeout(timeout)
    }, [])

    const close = () => {
        setExpanded(false)

        progress.value = withTiming(0, {duration: 300})

        setTimeout(onClose, 300)
    }

    useEffect(() => {
        const back = BackHandler.addEventListener("hardwareBackPress", () => {
            close()
            return true
        })
        return () => back.remove()
    }, [])

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close movie details"
                style={StyleSheet.absoluteFill}
                onPress={close}
            />

            <Animated.View style={[styles.expanded, animatedStyle]}>
                {expanded && (
                    <ScrollView contentContainerStyle={{gap: 15}}>
                        <Pressable accessibilityRole="button" accessibilityLabel="Close movie details" onPress={close}>
                            <Text style={styles.text}>✕ Close</Text>
                        </Pressable>

                        <Trailer movie={movie}/>

                        <Text accessibilityRole="header" style={styles.title}>{movie.Title}</Text>
                        <Text style={styles.text}>{movie.Genre}</Text>
                        <Text style={styles.text}>{movie.Plot}</Text>

                        <Text style={styles.ratings}>IMDb: {movie.imdbRating}</Text>
                        {movie.imdbid && /^tt\d+$/.test(movie.imdbid) && (
                            <Pressable
                                accessibilityRole="link"
                                accessibilityLabel={`Open ${movie.Title} on IMDb in your browser`}
                                onPress={async () => {
                                    try {
                                        await Linking.openURL(`https://www.imdb.com/title/${movie.imdbid}/`)
                                    } catch {
                                        Alert.alert("Couldn't open IMDb", "A browser may not be available. Please try again.")
                                    }
                                }}
                            >
                                <Text style={{color: mainTheme.accent, paddingVertical: 12}}>
                                    Open on IMDb
                                </Text>
                            </Pressable>
                        )}
                    </ScrollView>
                )}
            </Animated.View>
        </>
    )
}

const styles = StyleSheet.create({
    expanded: {
        position: "absolute",
        backgroundColor: mainTheme.elevated,
        borderRadius: 15,
        padding: 15,
        elevation: 10,
    },

    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: mainTheme.text,
    },
    text: {
        fontSize: 16,
        color: mainTheme.text,
    },
    ratings: {
        fontSize: 14,
        color: mainTheme.muted,
    }
})
