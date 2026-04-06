import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Alert, Modal, ScrollView, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { jwtDecode } from 'jwt-decode';
import api from '../../utils/api';

export default function Dashboard() {
    const router = useRouter();
    const lastFetchTime = useRef(0);
    const [initialLoad, setInitialLoad] = useState(true);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locationStat, setLocationStat] = useState('Fetching location...');
    const [userRole, setUserRole] = useState(null);
    const [profileVisible, setProfileVisible] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', aadharStatus: '', id: '' });

    // Manual Location States
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [isManualLocation, setIsManualLocation] = useState(false);
    const [manualCoords, setManualCoords] = useState(null); // { latitude, longitude }

    // Work History & Rating States
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [workHistory, setWorkHistory] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [jobCount, setJobCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const now = Date.now();
            if (now - lastFetchTime.current > 60000 || initialLoad || isManualLocation) {
                fetchJobs();
                loadProfile();
                lastFetchTime.current = now;
                setInitialLoad(false);
            }
        }, [initialLoad, isManualLocation, manualCoords])
    );

    const loadProfile = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token || token === 'null') return;

            const [name, email, phone, role, aadharStatus] = await Promise.all([
                AsyncStorage.getItem('userName'),
                AsyncStorage.getItem('userEmail'),
                AsyncStorage.getItem('userPhone'),
                AsyncStorage.getItem('role'),
                AsyncStorage.getItem('aadharStatus')
            ]);

            let userId = null;
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    userId = decoded.user?.id;
                } catch (e) {
                    console.log('JWT Decode Error:', e);
                }
            }

            setProfile({
                name: name || '',
                email: email || '',
                phone: phone || '',
                role: role || '',
                aadharStatus: aadharStatus || 'pending',
                id: userId
            });
            setUserRole(role || '');

            if (role === 'worker' && userId && token) {
                fetchHistory(userId);
            }
        } catch (e) {
            console.log('LoadProfile Error:', e);
        }
    };

    const fetchHistory = async (userId) => {
        try {
            const res = await api.get(`/jobs/worker/${userId}/history`);
            setWorkHistory(res.data.history);
            setAvgRating(res.data.avgRating);
            setJobCount(res.data.count);
        } catch (e) {
            console.log('FetchHistory Error:', e);
        }
    };

    const fetchJobs = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token || token === 'null') return;

            setLoading(initialLoad || !jobs.length);
            let lat = 0;
            let lng = 0;

            if (isManualLocation && manualCoords) {
                lat = manualCoords.latitude;
                lng = manualCoords.longitude;
                updateLocationText(lat, lng);
            } else {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let lastLoc = await Location.getLastKnownPositionAsync({});
                    if (lastLoc) {
                        lat = lastLoc.coords.latitude;
                        lng = lastLoc.coords.longitude;
                        updateLocationText(lat, lng);
                    }
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                        .then(async (currentLoc) => {
                            const newLat = currentLoc.coords.latitude;
                            const newLng = currentLoc.coords.longitude;
                            if (Math.abs(newLat - lat) > 0.005 || Math.abs(newLng - lng) > 0.005) {
                                const res = await api.get(`/jobs?lat=${newLat}&lng=${newLng}`);
                                setJobs(res.data);
                                updateLocationText(newLat, newLng);
                            }
                        }).catch(() => { });
                } else {
                    setLocationStat('Showing all jobs (Location disabled)');
                }
            }

            const res = await api.get(`/jobs?lat=${lat}&lng=${lng}`);
            setJobs(res.data);
        } catch (err) {
            console.log('FetchJobs Error:', err);
            setLocationStat('Error loading jobs.');
        } finally {
            setLoading(false);
        }
    };

    const updateLocationText = (lat, lng) => {
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
            .then(reverseArr => {
                if (reverseArr.length > 0) {
                    let bestLoc = reverseArr[0].city || reverseArr[0].subregion || reverseArr[0].region || 'your area';
                    setLocationStat(`Showing jobs near ${bestLoc}`);
                }
            })
            .catch(() => setLocationStat('Showing jobs near your location'));
    };

    const handleSelectManualLocation = (coords) => {
        setManualCoords(coords);
        setIsManualLocation(true);
        setMapModalVisible(false);
    };

    const resetToGPS = () => {
        setIsManualLocation(false);
        setManualCoords(null);
        setMapModalVisible(false);
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
            <View style={styles.jobInfoRow}>
                <Text style={styles.jobSalary}>₹{item.salary}</Text>
                <Text style={styles.jobLocation}>📍 {item.locationName || 'Location N/A'}</Text>
            </View>
            {userRole === 'worker' && (
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
                <TouchableOpacity style={styles.avatar} onPress={() => setProfileVisible(true)}>
                    <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerCenter} onPress={() => setMapModalVisible(true)}>
                    <Text style={styles.title} numberOfLines={1}>BlueCollar</Text>
                    <Text style={[styles.subtitle, isManualLocation && { color: '#007bff', fontWeight: 'bold' }]} numberOfLines={1}>
                        {locationStat} {isManualLocation ? '✎' : '▾'}
                    </Text>
                </TouchableOpacity>

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

            {/* Jobs List */}
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

            {/* Manual Location Modal */}
            <Modal
                visible={mapModalVisible}
                animationType="slide"
                onRequestClose={() => setMapModalVisible(false)}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Location</Text>
                        <TouchableOpacity onPress={resetToGPS}>
                            <Text style={styles.modalResetText}>Reset to GPS</Text>
                        </TouchableOpacity>
                    </View>
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: manualCoords?.latitude || profile.lat || 28.6139,
                            longitude: manualCoords?.longitude || profile.lng || 77.2090,
                            latitudeDelta: 0.1,
                            longitudeDelta: 0.1,
                        }}
                        onPress={(e) => handleSelectManualLocation(e.nativeEvent.coordinate)}
                    >
                        {(manualCoords || isManualLocation) && (
                            <Marker coordinate={{
                                latitude: manualCoords?.latitude || 28.6139,
                                longitude: manualCoords?.longitude || 77.2090
                            }} />
                        )}
                    </MapView>
                    <View style={styles.mapFooter}>
                        <Text style={styles.mapHint}>Tap on the map to set your job search location</Text>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Profile Drawer Modal */}
            <Modal
                visible={profileVisible}
                transparent={true}
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
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>{getInitials(profile.name)}</Text>
                            </View>
                            <Text style={styles.profileName}>{profile.name || 'User'}</Text>
                            {profile.role === 'worker' && jobCount > 0 && (
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingBadgeText}>⭐ {avgRating} ({jobCount} jobs)</Text>
                                </View>
                            )}
                            <View style={[styles.roleBadge, { backgroundColor: profile.role === 'employer' ? '#007bff22' : '#28a74522', marginTop: 8 }]}>
                                <Text style={[styles.roleBadgeText, { color: profile.role === 'employer' ? '#007bff' : '#28a745' }]}>
                                    {profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                                </Text>
                            </View>
                        </View>
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

                        {profile.role === 'worker' && (
                            <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryModalVisible(true)}>
                                <Text style={styles.historyBtnText}>📜 View Work History</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setProfileVisible(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Work History Modal */}
            <Modal visible={historyModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Work History</Text>
                        <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.modalCloseText}>
                            <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={workHistory}
                        keyExtractor={item => item._id}
                        contentContainerStyle={{ padding: 15 }}
                        renderItem={({ item }) => (
                            <View style={styles.historyCard}>
                                <View style={styles.historyTop}>
                                    <Text style={styles.historyTitle}>{item.job?.title}</Text>
                                    <Text style={styles.historyRating}>⭐ {item.rating || 'N/A'}</Text>
                                </View>
                                <Text style={styles.historyDetail}>📍 {item.job?.locationName}</Text>
                                <Text style={styles.historyDetail}>💰 ₹{item.job?.salary}</Text>

                                {item.workImages && item.workImages.length > 0 && (
                                    <ScrollView horizontal style={{ flexDirection: 'row', marginVertical: 8 }}>
                                        {item.workImages.map((img, i) => (
                                            <Image
                                                key={i}
                                                source={{ uri: img.startsWith('http') ? img : `${api.defaults.baseURL.replace('/api', '')}${img}` }}
                                                style={{ width: 60, height: 60, borderRadius: 6, marginRight: 6 }}
                                            />
                                        ))}
                                    </ScrollView>
                                )}

                                {item.review && <Text style={styles.historyReview}>"{item.review}"</Text>}
                                <Text style={styles.historyDate}>{new Date(item.completedAt).toLocaleDateString()}</Text>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No completed jobs yet.</Text>}
                    />
                </SafeAreaView>
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
    header: {
        paddingHorizontal: 16,
        paddingTop: 10,
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
    jobCard: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#007bff' },
    jobDesc: { color: '#555', marginVertical: 10, fontSize: 15, lineHeight: 22 },
    jobInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    jobSalary: { fontWeight: '700', color: '#28a745', fontSize: 16 },
    jobLocation: { color: '#666', fontSize: 14, fontWeight: '500' },
    applyButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
    applyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
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
    closeBtn: { backgroundColor: '#c0cad4', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    closeBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
    ratingBadge: { backgroundColor: '#ffc10722', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, borderWidth: 1, borderColor: '#ffc10744' },
    ratingBadgeText: { color: '#ff9800', fontWeight: 'bold', fontSize: 14 },
    historyBtn: { backgroundColor: '#007bff', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 5 },
    historyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    historyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    historyRating: { fontWeight: 'bold', color: '#ffc107' },
    historyDetail: { fontSize: 13, color: '#666', marginBottom: 2 },
    historyReview: { fontStyle: 'italic', color: '#555', marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 },
    historyDate: { fontSize: 11, color: '#999', marginTop: 10, textAlign: 'right' },
    modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalCloseText: { color: '#dc3545', fontWeight: '600' },
    modalResetText: { color: '#007bff', fontWeight: '600' },
    mapFooter: { padding: 20, backgroundColor: '#fff', alignItems: 'center' },
    mapHint: { color: '#666', fontSize: 14, textAlign: 'center' }
});
