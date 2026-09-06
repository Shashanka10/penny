import { AccountModal } from "@/components/AccountModal";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { useSetDefaultAccount } from "@/hooks/mutations/useAccountMutations";
import { useAccountsQuery } from "@/hooks/queries/useAccountsQuery";
import { useSupabase } from "@/hooks/useSupabase";
import { Account, AccountType } from "@/lib/services/accounts";
import { formatPrice } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

const ACCOUNT_ICON: Record<AccountType, keyof typeof Feather.glyphMap> = {
  CASH: "dollar-sign",
  BANK: "home",
  CREDIT_CARD: "credit-card",
  SAVINGS: "shield",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[#717784] text-[11px] uppercase tracking-wide mb-2 mt-6 mx-5">
      {children}
    </Text>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  danger = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center bg-[#11141B] px-4 py-3.5 border-b border-[#242832] last:border-b-0"
    >
      <View className="w-8 h-8 rounded-full bg-[#171A22] border border-[#242832] items-center justify-center mr-3">
        <Feather name={icon} size={15} color={danger ? "#FF6B4A" : "#8F96A3"} />
      </View>
      <Text
        className={`flex-1 text-sm ${
          danger ? "text-[#FF6B4A]" : "text-[#F5F7FA]"
        }`}
      >
        {label}
      </Text>
      {value && <Text className="text-[#8F96A3] text-xs mr-2">{value}</Text>}
      {showChevron && onPress && (
        <Feather name="chevron-right" size={16} color="#717784" />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const currency = useUserStore((state) => state.currency);
  const setCurrency = useUserStore((state) => state.setCurrency);
  const [biometricLock, setBiometricLock] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    isError: accountsError,
  } = useAccountsQuery();
  const { mutateAsync: setDefaultAccount } = useSetDefaultAccount();

  const handlePickAvatar = async () => {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to set a profile picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const filename = asset.uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      await user.setProfileImage({ file: dataUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
      Alert.alert("Error", "Couldn't upload your photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAccount(null);
  };

  const handleMadeDefault = async () => {
    if (!editingAccount) return;
    try {
      await setDefaultAccount(editingAccount.id);
      closeModal();
    } catch {
      Alert.alert("Error", "Couldn't set this as the default account.");
    }
  };

  const handleCurrencySelect = async (selected: { code: string }) => {
    setCurrencyPickerOpen(false);
    if (!user) return;
    try {
      const { error } = await supabase
        .from("users")
        .update({ currency: selected.code })
        .eq("clerk_id", user.id);
      if (error) throw error;
      setCurrency(selected.code);
    } catch {
      Alert.alert("Error", "Couldn't update your currency.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090B10]" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-full bg-[#171A22] border border-[#242832] items-center justify-center">
              <Feather name="user" size={18} color="#4A9EFF" />
            </View>

            <Text className="text-[#F5F7FA] text-xl font-semibold">
              Profile
            </Text>
          </View>
        </View>

        {/* User card */}
        <View className="mx-5 mt-2 bg-[#11141B] border border-[#242832] rounded-2xl px-5 py-6 items-center">
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.8}
            className="w-20 h-20 rounded-full bg-[#171A22] items-center justify-center overflow-hidden border-2 border-[#292D37]"
          >
            {uploadingAvatar ? (
              <ActivityIndicator color="#8F96A3" />
            ) : user?.imageUrl && user.hasImage ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: 80, height: 80 }}
                contentFit="cover"
              />
            ) : (
              <Feather name="user" size={30} color="#8F96A3" />
            )}
            <View className="absolute bottom-0 inset-x-0 h-6 bg-black/50 items-center justify-center">
              <Feather name="camera" size={13} color="#F2EFE9" />
            </View>
          </TouchableOpacity>

          <Text className="text-[#F5F7FA] text-2xl font-bold mt-3.5">
            {user?.firstName} {user?.lastName}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1">
            <Feather name="mail" size={11} color="#717784" />
            <Text className="text-[#8F96A3] text-xs" numberOfLines={1}>
              {user?.emailAddresses?.[0]?.emailAddress}
            </Text>
          </View>
        </View>

        {/* Accounts */}
        <SectionLabel>Accounts</SectionLabel>
        <View className="mx-5 rounded-2xl overflow-hidden border border-[#242832]">
          {loadingAccounts ? (
            <View className="bg-[#11141B] px-4 py-5 items-center">
              <ActivityIndicator color="#4A9EFF" />
            </View>
          ) : accountsError ? (
            <View className="bg-[#11141B] px-4 py-5 items-center">
              <Text className="text-[#717784] text-xs">
                Couldn&apos;t load your accounts.
              </Text>
            </View>
          ) : (
            accounts.map((account) => (
              <Row
                key={account.id}
                icon={ACCOUNT_ICON[account.type]}
                label={account.name + (account.is_default ? " (default)" : "")}
                value={formatPrice(account.balance, currency)}
                onPress={() => {
                  setEditingAccount(account);
                  setModalVisible(true);
                }}
              />
            ))
          )}

          <Row
            icon="plus"
            label="Add account"
            onPress={() => {
              setEditingAccount(null);
              setModalVisible(true);
            }}
          />
        </View>

        {/* Preferences */}
        <SectionLabel>Preferences</SectionLabel>
        <View className="mx-5 rounded-2xl overflow-hidden border border-[#242832]">
          <Row
            icon="dollar-sign"
            label="Currency"
            value={currency}
            onPress={() => setCurrencyPickerOpen(true)}
          />

          <View className="flex-row items-center bg-[#11141B] px-4 py-3.5">
            <View className="w-8 h-8 rounded-full bg-[#171A22] border border-[#242832] items-center justify-center mr-3">
              <Feather name="lock" size={15} color="#8F96A3" />
            </View>
            <Text className="flex-1 text-sm text-[#F5F7FA]">
              Biometric lock
            </Text>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{ false: "#242832", true: "#4A9EFF" }}
              thumbColor="#F5F7FA"
            />
          </View>
        </View>

        {/* Account actions */}
        <SectionLabel>Account</SectionLabel>
        <View className="mx-5 rounded-2xl overflow-hidden border border-[#242832]">
          <Row
            icon="log-out"
            label="Sign out"
            onPress={handleSignOut}
            showChevron={false}
            danger
          />
        </View>
      </ScrollView>

      {user && (
        <AccountModal
          visible={modalVisible}
          account={editingAccount}
          onClose={closeModal}
          onSaved={closeModal}
          onDeleted={closeModal}
          onMadeDefault={handleMadeDefault}
        />
      )}

      <CurrencyPicker
        visible={currencyPickerOpen}
        selectedCode={currency}
        onSelect={handleCurrencySelect}
        onClose={() => setCurrencyPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
