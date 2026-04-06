import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import api from '../../utils/api';

export default function Applications() {
    const [role, setRole] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            setErrorMsg('');
            const storedRole = await AsyncStorage.getItem('role');
            setRole(storedRole);

            if (storedRole === 'employer') {
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

    const renderWorkerView = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.title}>{item.job?.title || 'Unknown Job'}</Text>
            <Text style={styles.desc}>{item.job?.description || 'N/A'}</Text>
            <Text style={styles.location}>📍 {item.job?.locationName || 'Location N/A'}</Text>
            <Text style={{ ...styles.status, color: item.status === 'accepted' ? '#28a745' : item.status === 'rejected' ? '#dc3545' : '#ffc107', marginTop: 10 }}>
                Status: {item.status.toUpperCase()}
            </Text>
        </View>
    );

    const renderEmployerView = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>Applicants: {item.applications.length}</Text>
            {item.applications.map(app => (
                <View key={app._id} style={styles.applicantRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.applicantName}>{app.worker?.name}</Text>
                        <Text style={styles.applicantPhone}>{app.worker?.phone || app.worker?.email}</Text>
                        <Text style={styles.applicantStatus}>Current Status: {app.status}</Text>
                    </View>
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
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    card: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, elevation: 4 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#007bff' },
    desc: { color: '#555', marginVertical: 10, fontSize: 15 },
    status: { fontWeight: '700', fontSize: 16 },
    location: { color: '#666', fontSize: 14, fontWeight: '500' },
    applicantRow: { marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    applicantName: { fontWeight: 'bold', fontSize: 16 },
    applicantPhone: { color: '#666', fontSize: 14 },
    applicantStatus: { marginTop: 4, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 10 },
    acceptBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 6, marginRight: 5 },
    rejectBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 6 },
    btnText: { color: '#fff', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
    errorText: { color: '#dc3545', textAlign: 'center', marginTop: 10, fontWeight: 'bold' }
});
