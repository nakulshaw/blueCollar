import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Alert, Modal, ScrollView, SafeAreaView, Platform, StatusBar
} from 'react-native';
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
    const [profileVisible, setProfileVisible] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', aadharStatus: '' });

    useEffect(() => {
        fetchJobs();
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const name = await AsyncStorage.getItem('userName') || '';
        const email = await AsyncStorage.getItem('userEmail') || '';
        const phone = await AsyncStorage.getItem('userPhone') || '';
        const role = await AsyncStorage.getItem('role') || '';
        const aadharStatus = await AsyncStorage.getItem('aadharStatus') || 'pending';
        setProfile({ name, email, phone, role, aadharStatus });
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

                try {
                    let reverseArr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                    if (reverseArr.length > 0) {
                        let bestLoc = reverseArr[0].city || reverseArr[0].subregion || reverseArr[0].region;
                        setLocationStat(`Showing jobs near ${bestLoc}`);
                    } else {
                        setLocationStat('Showing jobs near your location');
                    }
                } catch (e) {
                    setLocationStat('Showing jobs near your location');
                }
            } else {
                setLocationStat('Showing all jobs (Location disabled)');
            }

            const res = await api.get(`/jobs?lat=${lat}&lng=${lng}`);
            setJobs(res.data);
        } catch (err) {
            console.log(err);
            setLocationStat('Error loading jobs. Please login again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['token', 'role', 'userName', 'userEmail', 'userPhone', 'aadharStatus']);
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

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const aadharBadgeColor = (status) => {
        if (status === 'verified') return '#28a745';
        if (status === 'rejected') return '#dc3545';
        return '#f0ad4e';
    };

    const renderItem = ({ item }) => (
        <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.jobSalary}>Salary: ₹{item.salary}</Text>
            {userRole !== 'employer' && (
                <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(item._id, item.title)}>
                    <Text style={styles.applyText}>Apply Now</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {/* Profile Avatar - top left */}
                <TouchableOpacity style={styles.avatar} onPress={() => setProfileVisible(true)}>
                    <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
                </TouchableOpacity>

                {/* Title area */}
                <View style={styles.headerCenter}>
                    <Text style={styles.title} numberOfLines={1}>BlueCollar</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>{locationStat}</Text>
                </View>

                {/* Action buttons */}
                <View style={styles.headerActions}>
                    {userRole === 'employer' && (
                        <TouchableOpacity onPress={() => router.push('/postJob')} style={[styles.postJobBtn, { marginRight: 8 }]}>
                            <Text style={styles.postJobText}>+ Post</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Jobs list */}
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

            {/* Profile Drawer Modal */}
            <Modal
                visible={profileVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setProfileVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setProfileVisible(false)}
                />
                <View style={styles.profileDrawer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Profile header */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>{getInitials(profile.name)}</Text>
                            </View>
                            <Text style={styles.profileName}>{profile.name || 'User'}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: profile.role === 'employer' ? '#007bff22' : '#28a74522' }]}>
                                <Text style={[styles.roleBadgeText, { color: profile.role === 'employer' ? '#007bff' : '#28a745' }]}>
                                    {profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Details */}
                        <View style={styles.detailsCard}>
                            <ProfileRow icon="✉️" label="Email" value={profile.email || 'Not provided'} />
                            <ProfileRow icon="📱" label="Phone" value={profile.phone || 'Not provided'} />
                            <ProfileRow
                                icon="🪪"
                                label="Aadhaar Status"
                                value={profile.aadharStatus ? profile.aadharStatus.charAt(0).toUpperCase() + profile.aadharStatus.slice(1) : 'Pending'}
                                valueColor={aadharBadgeColor(profile.aadharStatus)}
                            />
                        </View>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setProfileVisible(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function ProfileRow({ icon, label, value, valueColor }) {
    return (
        <View style={styles.profileRow}>
            <Text style={styles.profileRowIcon}>{icon}</Text>
            <View style={styles.profileRowContent}>
                <Text style={styles.profileRowLabel}>{label}</Text>
                <Text style={[styles.profileRowValue, valueColor ? { color: valueColor, fontWeight: '700' } : {}]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },

    // Header
    header: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 16,
        paddingBottom: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center', marginRight: 10, elevation: 3, shadowColor: '#007bff', shadowOpacity: 0.3, shadowRadius: 4 },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    headerCenter: { flex: 1 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 6 },
    logoutBtn: { backgroundColor: '#dc3545', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
    logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    postJobBtn: { backgroundColor: '#28a745', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
    postJobText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    // Job cards
    jobCard: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#007bff' },
    jobDesc: { color: '#555', marginVertical: 10, fontSize: 15, lineHeight: 22 },
    jobSalary: { fontWeight: '700', color: '#28a745', marginBottom: 15, fontSize: 16 },
    applyButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
    applyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },

    // Profile modal
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    profileDrawer: {
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '80%',
        backgroundColor: '#fff', padding: 24, paddingTop: 60,
        shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
    },
    profileHeader: { alignItems: 'center', marginBottom: 24 },
    avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 5, shadowColor: '#007bff', shadowOpacity: 0.4, shadowRadius: 8 },
    avatarLargeText: { color: '#fff', fontWeight: 'bold', fontSize: 30 },
    profileName: { fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 8 },
    roleBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
    roleBadgeText: { fontWeight: '700', fontSize: 13 },

    detailsCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 24 },
    profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
    profileRowIcon: { fontSize: 20, marginRight: 12 },
    profileRowContent: { flex: 1 },
    profileRowLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
    profileRowValue: { fontSize: 15, color: '#333', fontWeight: '500' },

    closeBtn: { backgroundColor: '#007bff', padding: 14, borderRadius: 10, alignItems: 'center' },
    closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
