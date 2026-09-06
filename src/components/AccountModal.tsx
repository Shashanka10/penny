import { FormSheetModal } from "@/components/FormSheetModal";
import { COLORS } from "@/constants/theme";
import {
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/hooks/mutations/useAccountMutations";
import { Account, AccountType } from "@/lib/services/accounts";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

const ACCOUNT_TYPES: AccountType[] = ["CASH", "BANK", "CREDIT_CARD", "SAVINGS"];

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Cash",
  BANK: "Bank",
  CREDIT_CARD: "Credit card",
  SAVINGS: "Savings",
};

export function AccountModal({
  visible,
  account,
  onClose,
  onSaved,
  onDeleted,
  onMadeDefault,
}: {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onMadeDefault: () => void;
}) {
  const isEditing = !!account;
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CASH");
  const [error, setError] = useState("");

  const { mutateAsync: createAccount, isPending: creating } =
    useCreateAccount();
  const { mutateAsync: updateAccount, isPending: updating } =
    useUpdateAccount();
  const { mutateAsync: deleteAccount } = useDeleteAccount();

  const saving = creating || updating;

  useEffect(() => {
    if (visible) {
      setName(account?.name ?? "");
      setType(account?.type ?? "CASH");
      setError("");
    }
  }, [visible, account]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter an account name.");
      return;
    }
    setError("");
    try {
      if (isEditing) {
        await updateAccount({
          accountId: account.id,
          payload: { name: name.trim(), type },
        });
      } else {
        await createAccount({ name: name.trim(), type });
      }
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    try {
      const result = await deleteAccount({ accountId: account.id });
      if (result.deleted) {
        onDeleted();
        return;
      }

      Alert.alert(
        "Delete account",
        `This will also delete ${result.transactionCount} transaction${
          result.transactionCount === 1 ? "" : "s"
        }. This can't be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteAccount({ accountId: account.id, force: true });
                onDeleted();
              } catch {
                Alert.alert("Error", "Couldn't delete the account.");
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert("Error", "Couldn't check the account's transactions.");
    }
  };

  return (
    <FormSheetModal
      visible={visible}
      title={isEditing ? "Edit account" : "Add account"}
      onClose={onClose}
    >
      <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. HDFC Savings"
        placeholderTextColor={COLORS.placeholder}
        className="bg-[#11141B] border border-[#242832] rounded-xl px-4 py-3.5 text-sm text-[#F5F7FA] mb-5"
      />

      <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">Type</Text>
      <View className="flex-row flex-wrap gap-2 mb-5">
        {ACCOUNT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            className={`px-3.5 py-2 rounded-full border ${
              type === t
                ? "bg-[#F5F7FA] border-[#F5F7FA]"
                : "bg-[#11141B] border-[#242832]"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                type === t ? "text-[#090B10]" : "text-[#8F96A3]"
              }`}
            >
              {ACCOUNT_TYPE_LABEL[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text className="text-[#FF6B4A] text-xs mb-3">{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-[#F5F7FA] rounded-xl py-4 items-center mb-3"
        activeOpacity={0.85}
      >
        <Text className="text-[#090B10] text-sm font-semibold">
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add account"}
        </Text>
      </TouchableOpacity>

      {isEditing && !account.is_default && (
        <TouchableOpacity onPress={onMadeDefault} className="py-3 items-center">
          <Text className="text-[#4A9EFF] text-sm font-medium">
            Make default
          </Text>
        </TouchableOpacity>
      )}

      {isEditing && (
        <TouchableOpacity onPress={handleDelete} className="py-3 items-center">
          <Text className="text-[#FF6B4A] text-sm font-medium">
            Delete account
          </Text>
        </TouchableOpacity>
      )}
    </FormSheetModal>
  );
}
