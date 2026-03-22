import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>📝</Text>
        <Text style={styles.placeholderText}>Notes</Text>
        <Text style={styles.placeholderSub}>Coming in Phase 2 — rich-text notes linked to tasks & events</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderIcon: { fontSize: 60, marginBottom: 16 },
  placeholderText: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 8 },
  placeholderSub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
