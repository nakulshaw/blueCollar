import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import api from '../../utils/api';

export default function PostJob() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');
    const [locationRegion, setLocationRegion] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({});
                    const initLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                    setLocationRegion(initLoc);
                    setSelectedLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                } else {
                    const fallback = { latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                    setLocationRegion(fallback);
                    setSelectedLocation({ latitude: 28.6139, longitude: 77.2090 });
                }
            } catch (e) {
                const fallback = { latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                setLocationRegion(fallback);
                setSelectedLocation({ latitude: 28.6139, longitude: 77.2090 });
            }
        })();
    }, []);

    const handleMapPress = (e) => {
        if (e.nativeEvent.coordinate) {
            setSelectedLocation(e.nativeEvent.coordinate);
        }
    };

    const handlePostJob = async () => {
        if (!title || !description || !salary) {
            return Alert.alert('Error', 'Please fill all fields');
        }

        try {
            let locationPoint = [0, 0];
            if (selectedLocation) {
                locationPoint = [selectedLocation.longitude, selectedLocation.latitude];
            } else {
                return Alert.alert('Error', 'Please select a location on the map');
            }

            await api.post('/jobs', {
                title,
                description,
                salary,
                locationPoint
            });

            Alert.alert('Success', 'Job posted successfully');
            router.back();
        } catch (err) {
            console.log(err);
            Alert.alert('Error', 'Could not post job');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Post a Job</Text>

            <TextInput
                style={styles.input}
                placeholder="Job Title (e.g. Plumber needed)"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Job Description"
                multiline
                value={description}
                onChangeText={setDescription}
            />
            <TextInput
                style={styles.input}
                placeholder="Salary / Wages (₹)"
                keyboardType="numeric"
                value={salary}
                onChangeText={setSalary}
            />

            <Text style={styles.mapLabel}>Select Job Location (Tap on map to place pin):</Text>
            {locationRegion ? (
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        initialRegion={locationRegion}
                        onPress={handleMapPress}
                    >
                        {selectedLocation && (
                            <Marker coordinate={selectedLocation} />
                        )}
                    </MapView>
                </View>
            ) : (
                <Text style={{ marginVertical: 10 }}>Loading map...</Text>
            )}

            <TouchableOpacity style={styles.button} onPress={handlePostJob}>
                <Text style={styles.buttonText}>PUBLISH JOB</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: '#f4f6f8' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#dee2e6' },
    button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, shadowColor: '#007bff', shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    mapLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    mapContainer: { height: 200, width: '100%', marginBottom: 20, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#dee2e6' },
    map: { flex: 1 }
});
