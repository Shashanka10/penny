import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export function FormSheetModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-[#11141B] border-t border-[#242832] rounded-t-3xl px-5 pt-5 pb-8">
          <View className="w-10 h-1 rounded-full bg-[#292D37] self-center mb-5" />

          <Text className="text-[#F5F7FA] text-base font-semibold mb-4">
            {title}
          </Text>

          {children}

          <TouchableOpacity onPress={onClose} className="py-2 items-center">
            <Text className="text-[#8F96A3] text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
