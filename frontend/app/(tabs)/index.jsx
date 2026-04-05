import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../utils/api';

export default function Dashboard() {
    const router = useRouter();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locationStat, setLocationStat] = useState('Fetching location...');
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetchJobs();
        checkRole();
    }, []);

    const checkRole = async () => {
        const role = await AsyncStorage.getItem('role');
        setUserRole(role);
    };

    const fetchJobs = async () => {
        try {
            setLoading(true);
            let { status } = await Location.requestForegroundPermissionsAsync();

            let lat = 0;
            let lng = 0;

            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                lat = location.coords.latitude;
                lng = location.coords.longitude;
                setLocationStat('Showing jobs near your location');
            } else {
                setLocationStat('Showing all jobs (Location disabled)');
            }

            const res = await api.get(`/jobs?lat=${lat}&lng=${lng}`);
            setJobs(res.data);
        } catch (err) {
            console.log(err);
            setLocationStat('Error loading jobs from server. If unauthorized, please layout and login again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        router.replace('/login');
    };

    const handleApply = async (jobId, jobTitle) => {
        try {
            await api.post(`/jobs/${jobId}/apply`);
            if (typeof window !== 'undefined' && window.alert) {
                window.alert(`Success! You have applied for: ${jobTitle}. Track it in the Tracking tab.`);
            } else {
                Alert.alert('Application Sent!', `You have applied for: ${jobTitle}.`);
            }
        } catch (err) {
            const msg = err.response?.data?.msg || 'Could not apply. Maybe already applied?';
            if (typeof window !== 'undefined' && window.alert) window.alert(msg);
            else Alert.alert('Error', msg);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.jobSalary}>Salary: ₹{item.salary}</Text>
            <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(item._id, item.title)}>
                <Text style={styles.applyText}>Apply Now</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Blue Collar Jobs</Text>
                    <Text style={styles.subtitle}>{locationStat}</Text>
                </View>
                {userRole === 'employer' && (
                    <TouchableOpacity onPress={() => router.push('/postJob')} style={styles.postJobBtn}>
                        <Text style={styles.postJobText}>+ Post Job</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No jobs found in your area.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
    logoutBtn: { backgroundColor: '#dc3545', padding: 10, borderRadius: 6, marginLeft: 10 },
    logoutText: { color: '#fff', fontWeight: 'bold' },
    postJobBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 6, marginLeft: 10 },
    postJobText: { color: '#fff', fontWeight: 'bold' },
    jobCard: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#007bff' },
    jobDesc: { color: '#555', marginVertical: 10, fontSize: 15, lineHeight: 22 },
    jobSalary: { fontWeight: '700', color: '#28a745', marginBottom: 15, fontSize: 16 },
    applyButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
    applyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' }
});
