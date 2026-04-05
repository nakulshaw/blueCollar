import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#007bff' }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="postJob"
                options={{
                    href: null,
                    title: 'Post Job'
                }}
            />
            <Tabs.Screen
                name="applications"
                options={{
                    title: 'Tracking',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-list" size={28} color={color} />,
                }}
            />
        </Tabs>
    );
}
