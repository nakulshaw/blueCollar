import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';

export default function Applications() {
    const [role, setRole] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Completion & Review states
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [uploadingAppId, setUploadingAppId] = useState(null);
    const [workerHistory, setWorkerHistory] = useState([]);
    const [workerAvgRating, setWorkerAvgRating] = useState(0);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedWorkerName, setSelectedWorkerName] = useState('');
    const [fetchingHistory, setFetchingHistory] = useState(false);

    useEffect(() => {
        const loadRole = async () => {
            const storedRole = await AsyncStorage.getItem('role');
            setRole(storedRole);
        };
        loadRole();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (role) fetchData();
        }, [role])
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            setErrorMsg('');
            if (role === 'employer') {
                const res = await api.get('/jobs/employer/me');
                setData(res.data);
            } else {
                const res = await api.get('/jobs/worker/applications');
                setData(res.data);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (appId, newStatus) => {
        try {
            await api.put(`/jobs/applications/${appId}`, { status: newStatus });
            if (typeof window !== 'undefined' && window.alert) window.alert(`Updated status to ${newStatus}`);
            else Alert.alert('Success', `Updated status to ${newStatus}`);
            fetchData();
        } catch (err) {
            if (typeof window !== 'undefined' && window.alert) window.alert('Failed to update status');
            else Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleCompleteJob = async (appId) => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission Denied', 'We need access to your photos to upload work evidence.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsMultipleSelection: true,
                quality: 0.7,
            });

            if (!result.canceled && result.assets.length > 0) {
                setUploadingAppId(appId);
                const formData = new FormData();
                result.assets.forEach((asset, index) => {
                    const localUri = asset.uri;
                    const filename = localUri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('workImages', { uri: localUri, name: filename, type });
                });

                await api.put(`/jobs/applications/${appId}/complete`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                Alert.alert('Success', 'Job marked as completed with evidence!');
                fetchData();
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to upload work evidence.');
        } finally {
            setUploadingAppId(null);
        }
    };

    const handleSubmitReview = async () => {
        try {
            await api.put(`/jobs/applications/${selectedAppId}/review`, { rating, review: reviewText });
            setReviewModalVisible(false);
            setRating(5);
            setReviewText('');
            Alert.alert('Success', 'Worker rated successfully!');
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to submit review.');
        }
    };

    const handleViewWorkerHistory = async (workerId, workerName) => {
        try {
            setFetchingHistory(true);
            setSelectedWorkerName(workerName);
            const res = await api.get(`/jobs/worker/${workerId}/history`);
            setWorkerHistory(res.data.history);
            setWorkerAvgRating(res.data.avgRating);
            setHistoryModalVisible(true);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch worker history.');
        } finally {
            setFetchingHistory(false);
        }
    };

    const renderWorkerView = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.title}>{item.job?.title || 'Unknown Job'}</Text>
            <Text style={styles.desc}>{item.job?.description || 'N/A'}</Text>
            <Text style={styles.location}>📍 {item.job?.locationName || 'Location N/A'}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ ...styles.status, color: item.status === 'completed' ? '#007bff' : item.status === 'accepted' ? '#28a745' : item.status === 'rejected' ? '#dc3545' : '#ffc107' }}>
                    Status: {item.status.toUpperCase()}
                </Text>
                {item.rating && <Text style={styles.ratingText}>⭐ {item.rating}</Text>}
            </View>

            {item.status === 'accepted' && (
                <TouchableOpacity
                    style={[styles.completeBtn, uploadingAppId === item._id && { opacity: 0.5 }]}
                    onPress={() => handleCompleteJob(item._id)}
                    disabled={!!uploadingAppId}
                >
                    <Text style={styles.btnText}>{uploadingAppId === item._id ? 'Uploading...' : 'Mark as Completed'}</Text>
                </TouchableOpacity>
            )}

            {item.workImages && item.workImages.length > 0 && (
                <View style={{ marginTop: 10 }}>
                    <Text style={styles.reviewLabel}>Work Evidence:</Text>
                    <ScrollView horizontal style={{ flexDirection: 'row', marginVertical: 5 }}>
                        {item.workImages.map((img, i) => (
                            <Image
                                key={i}
                                source={{ uri: img.startsWith('http') ? img : `${api.defaults.baseURL.replace('/api', '')}${img}` }}
                                style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {item.review && (
                <View style={styles.reviewBox}>
                    <Text style={styles.reviewLabel}>Employer's Review:</Text>
                    <Text style={styles.reviewContent}>"{item.review}"</Text>
                </View>
            )}
        </View>
    );

    const renderEmployerView = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>Applicants: {item.applications.length}</Text>
            {item.applications.map(app => (
                <View key={app._id} style={styles.applicantRow}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewWorkerHistory(app.worker?._id, app.worker?.name)}>
                        <Text style={styles.applicantName}>{app.worker?.name} <Text style={{ fontSize: 12, color: '#007bff', fontWeight: 'normal' }}>(View Portfolio)</Text></Text>
                        <Text style={styles.applicantPhone}>{app.worker?.phone || app.worker?.email}</Text>
                        <Text style={styles.applicantStatus}>Current Status: {app.status}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionRow}>
                        {app.status === 'pending' && (
                            <>
                                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleUpdateStatus(app._id, 'accepted')}>
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateStatus(app._id, 'rejected')}>
                                    <Text style={styles.btnText}>Reject</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {app.status === 'completed' && !app.rating && (
                            <TouchableOpacity
                                style={styles.rateBtn}
                                onPress={() => { setSelectedAppId(app._id); setReviewModalVisible(true); }}
                            >
                                <Text style={styles.btnText}>Rate Worker</Text>
                            </TouchableOpacity>
                        )}
                        {app.rating && <Text style={styles.ratingText}>Rated: ⭐{app.rating}</Text>}
                    </View>
                    {app.workImages && app.workImages.length > 0 && (
                        <ScrollView horizontal style={styles.evidenceLine}>
                            {app.workImages.map((img, i) => (
                                <Image
                                    key={i}
                                    source={{ uri: img.startsWith('http') ? img : `${api.defaults.baseURL.replace('/api', '')}${img}` }}
                                    style={styles.evidenceImage}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{role === 'employer' ? 'My Posted Jobs' : 'My Applications'}</Text>
            </View>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item._id}
                    renderItem={role === 'employer' ? renderEmployerView : renderWorkerView}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>Nothing to show here.</Text>}
                />
            )}

            {/* Rating Modal */}
            <Modal visible={reviewModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.ratingBox}>
                        <Text style={styles.modalTitle}>Rate Worker</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                    <Text style={{ fontSize: 30, color: s <= rating ? '#ffc107' : '#ddd' }}>★</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.reviewInput}
                            placeholder="Write a short review..."
                            multiline
                            value={reviewText}
                            onChangeText={setReviewText}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setReviewModalVisible(false)}>
                                <Text style={{ color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReview}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Worker Portfolio Modal */}
            <Modal visible={historyModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>{selectedWorkerName}'s Portfolio</Text>
                            <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>⭐ Average Rating: {workerAvgRating}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                            <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={workerHistory}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={{ padding: 15 }}
                        renderItem={({ item }) => (
                            <View style={styles.historyCard}>
                                <View style={styles.historyTop}>
                                    <Text style={styles.historyTitle}>{item.job?.title || 'Completed Job'}</Text>
                                    {item.rating && <Text style={styles.historyRating}>⭐ {item.rating}</Text>}
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
                        ListEmptyComponent={<Text style={styles.emptyText}>No work history found for this worker.</Text>}
                    />
                </SafeAreaView>
            </Modal>

            {
                fetchingHistory && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#007bff" />
                    </View>
                )
            }
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: { padding: 20, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    card: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, elevation: 4 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#007bff' },
    desc: { color: '#555', marginVertical: 10, fontSize: 15 },
    status: { fontWeight: '700', fontSize: 16 },
    location: { color: '#666', fontSize: 14, fontWeight: '500' },
    applicantRow: { marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
    applicantName: { fontWeight: 'bold', fontSize: 16 },
    applicantPhone: { color: '#666', fontSize: 14 },
    applicantStatus: { marginTop: 4, fontWeight: '600', color: '#666' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
    acceptBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 6 },
    rejectBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 6 },
    completeBtn: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' },
    rateBtn: { backgroundColor: '#ffc107', padding: 8, borderRadius: 6 },
    btnText: { color: '#fff', fontWeight: 'bold' },
    ratingText: { fontWeight: 'bold', color: '#ffc107', fontSize: 16 },
    evidenceLine: { marginTop: 10, flexDirection: 'row' },
    evidenceImage: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
    reviewBox: { marginTop: 15, padding: 10, backgroundColor: '#f0f7ff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#007bff' },
    reviewLabel: { fontSize: 12, color: '#007bff', fontWeight: 'bold', marginBottom: 4 },
    reviewContent: { fontStyle: 'italic', color: '#444' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
    errorText: { color: '#dc3545', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    ratingBox: { width: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 15 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 },
    reviewInput: { backgroundColor: '#f4f6f8', padding: 12, borderRadius: 8, height: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 20 },
    submitBtn: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 10 },

    // History Modal Styles
    modalHeader: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    historyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    historyRating: { fontWeight: 'bold', color: '#ffc107' },
    historyDetail: { fontSize: 13, color: '#666', marginBottom: 2 },
    historyReview: { fontStyle: 'italic', color: '#555', marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 },
    historyDate: { fontSize: 11, color: '#999', marginTop: 10, textAlign: 'right' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }
});
