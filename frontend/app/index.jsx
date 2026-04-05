import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        const checkToken = async () => {
            // Minor delay to ensure smooth transition
            setTimeout(async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    if (token) {
                        router.replace('/(tabs)');
                    } else {
                        router.replace('/login');
                    }
                } catch (e) {
                    router.replace('/login');
                }
            }, 500);
        };

        checkToken();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#007bff" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    }
});
