import {Image, StyleSheet, Text, useWindowDimensions, View} from "react-native"
import React, {useRef} from "react"
import {Gesture, GestureDetector} from "react-native-gesture-handler"
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated"
import {scheduleOnRN} from "react-native-worklets"
import {mainTheme} from "../layout/GlobalTheme"

function MovieCard({loggedIn, movie, onPress, preference, onSwipe}) {
    const cardRef = useRef(null)
    const swipeX = useSharedValue(0)
    const swipeY = useSharedValue(0)
    const selected = useSharedValue(false)

    const {width} = useWindowDimensions()
    const cardWidth = (width - 40) / 3

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: swipeX.value}, {translateY: swipeY.value}],
        zIndex: selected.value || swipeX.value !== 0 || swipeY.value !== 0 ? 1 : 0,
        borderWidth: selected.value ? 3 : style.card.borderWidth,
        borderColor: selected.value ? mainTheme.accent : mainTheme.muted,
        shadowColor: selected.value ? mainTheme.accent : style.card.shadowColor,
        shadowOpacity: selected.value ? 0.8 : style.card.shadowOpacity,
        shadowRadius: selected.value ? 12 : style.card.shadowRadius,
        elevation: selected.value ? 8 : style.card.elevation
    }))

    const handlePress = (event) => {
        const action = event?.nativeEvent?.actionName

        if (loggedIn && ["like", "dislike", "remove"].includes(action)) {
            return onSwipe(movie, {like: true, dislike: false, remove: null}[action])
        }

        cardRef.current?.measureInWindow((x, y, width, height) => {
            onPress(movie, {x, y, width, height})
        })
    }

    const tap = Gesture.Tap()
        .onEnd((event, success) => {
            if (success) scheduleOnRN(handlePress)
        })

    const longPress = Gesture.LongPress()
        .enabled(loggedIn)
        .minDuration(200)
        .maxDistance(10)
        .onStart(() => {
            selected.value = true
        })

    const pan = Gesture.Pan()
        .enabled(loggedIn)
        .manualActivation(true)
        .onTouchesMove((event, manager) => {
            if (selected.value) manager.activate()
        })
        .onUpdate(event => {
            swipeX.value = event.translationX
            swipeY.value = event.translationY
        })
        .onEnd(event => {
            if (event.translationY < -15 && Math.abs(event.translationY) > Math.abs(event.translationX)) {
                scheduleOnRN(onSwipe, movie, null)
            } else if (Math.abs(event.translationX) > 40) {
                scheduleOnRN(onSwipe, movie, event.translationX > 0)
            }
        })
        .onFinalize(() => {
            swipeX.value = withTiming(0, {duration: 200})
            swipeY.value = withTiming(0, {duration: 200})
            selected.value = false
        })

    const gesture = Gesture.Simultaneous(longPress, Gesture.Race(tap, pan))

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View ref={cardRef} style={[style.card, {width: cardWidth}, animatedStyle]}
                accessible accessibilityRole="button"
                accessibilityLabel={`${movie.Title}, IMDb ${movie.imdbRating}${preference == null ? "" : preference ? ", liked" : ", disliked"}`}
                accessibilityActions={[{name: "activate", label: "Open details"}, ...(loggedIn ? [{name: "like", label: "Like"}, {name: "dislike", label: "Dislike"}, {name: "remove", label: "Remove choice"}] : [])]}
                onAccessibilityAction={handlePress} onAccessibilityTap={handlePress}>
                <Image style={style.image} resizeMode="cover" source={{uri: movie.Poster}}/>

                <View>
                    <View style={style.titleContainer}>
                        <Text numberOfLines={2} ellipsizeMode="tail" style={style.title}>
                            {movie.Title}
                        </Text>
                    </View>
                    <Text style={style.genre} numberOfLines={1} ellipsizeMode="tail">
                        {movie.Genre}
                    </Text>
                </View>

                {preference !== undefined && (
                    <View pointerEvents="none" style={[style.ratingBadge, {left: 6, right: "auto"}]}>
                        <Text style={style.ratingText}>
                            {preference ? "👍" : "👎"}
                        </Text>
                    </View>
                )}

                <View pointerEvents="none" style={style.ratingBadge}>
                    <Text style={style.ratingText}>★ {movie.imdbRating}</Text>
                </View>
            </Animated.View>
        </GestureDetector>
    )
}

const style = StyleSheet.create({
    card: {
        backgroundColor: mainTheme.surface,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: mainTheme.muted,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4
    },
    image: {
        width: "100%",
        aspectRatio: 2 / 3
    },
    titleContainer: {
        height: 28,
        justifyContent: "center"
    },
    title: {
        fontSize: 12,
        lineHeight: 14,
        textAlign: "center",
        fontWeight: "bold",
        color: mainTheme.text
    },
    genre: {
        textAlign: "center",
        fontSize: 10,
        color: mainTheme.muted
    },
    ratingBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 3
    },
    ratingText: {color: "#fff", fontSize: 12, fontWeight: "bold"}
})

export default React.memo(MovieCard)
