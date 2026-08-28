import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Student {
  id: string;
  // Nulável no banco: o perfil nasce no signup antes de o nome ser informado.
  full_name: string | null;
  avatar_url?: string;
}

interface StudentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (student: Student) => void;
  students: Student[];
  selectedStudentId?: string;
}

export function StudentPickerModal({
  visible,
  onClose,
  onSelect,
  students,
  selectedStudentId,
}: StudentPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const lowerQuery = searchQuery.toLowerCase();
    return students.filter((student) =>
      (student.full_name ?? '').toLowerCase().includes(lowerQuery)
    );
  }, [students, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-zinc-900 rounded-t-3xl h-[80%] border-t border-zinc-800">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-800">
            <Text className="text-xl font-bold text-white font-display">Selecionar Aluno</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-6 py-4">
            <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 h-12 border border-zinc-700">
              <Ionicons name="search" size={20} color="#A1A1AA" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar aluno..."
                placeholderTextColor="#A1A1AA"
                className="flex-1 ml-3 text-white h-full"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#A1A1AA" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                className={`flex-row items-center p-4 mb-3 rounded-xl border ${
                  selectedStudentId === item.id
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-zinc-800/50 border-zinc-800'
                }`}
              >
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    className="h-10 w-10 rounded-full mr-4 border border-zinc-700"
                    placeholder={{ blurhash: 'L6PZfS_u.AyD_N%MIAj[4n%M%Mt7' }} // Default profile placeholder
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="h-10 w-10 rounded-full bg-zinc-700 items-center justify-center mr-4">
                    <Text className="text-white font-bold text-sm">
                      {(item.full_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text
                    className={`text-base font-bold ${
                      selectedStudentId === item.id ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {item.full_name ?? 'Sem nome'}
                  </Text>
                </View>
                {selectedStudentId === item.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Ionicons name="people-outline" size={48} color="#52525B" />
                <Text className="text-zinc-500 mt-4 text-center">
                  {searchQuery ? 'Nenhum aluno encontrado' : 'Sua lista de alunos está vazia'}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}
