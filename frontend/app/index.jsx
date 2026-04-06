import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        const checkToken = async () => {
            // Wait for 1 second to show the branding properly
            setTimeout(async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    // Robust check: ensure token is a non-empty string and not "null"/"undefined"
                    if (token && token !== 'null' && token !== 'undefined' && token.length > 5) {
                        router.replace('/(tabs)');
                    } else {
                        // Clear potentially corrupted storage
                        if (token === 'null' || token === 'undefined') {
                            await AsyncStorage.removeItem('token');
                        }
                        router.replace('/login');
                    }
                } catch (e) {
                    router.replace('/login');
                }
            }, 1000);
        };

        checkToken();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
                {/* Logo removed due to build issues */}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 180,
        height: 180,
    }
});
