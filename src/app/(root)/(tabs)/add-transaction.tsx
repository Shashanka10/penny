import { AIActionCard } from "@/components/AIActionCard";
import { CalendarPicker } from "@/components/CalendarPicker";
import { PillGroup } from "@/components/PillGroup";
import { ReceiptScannerModal } from "@/components/ReceiptScannerModal";
import { VoiceRecorderModal } from "@/components/VoiceRecorderModal";
import {
  CategoryKey,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/constants/categories";
import { AI_GRADIENT, AI_GRADIENT_REVERSE } from "@/constants/theme";
import { useCreateTransaction } from "@/hooks/mutations/useTransactionMutations";
import { useAccountsQuery } from "@/hooks/queries/useAccountsQuery";
import {
  TransactionFormValues,
  transactionSchema,
} from "@/lib/schemas/transaction";
import { Account } from "@/lib/services/accounts";
import {
  ExtractedTransaction,
  extractTransactionFromReceipt,
} from "@/lib/services/extractTransaction";
import { InputMethod } from "@/lib/services/transactions";
import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPE_OPTIONS = [
  { key: "EXPENSE" as const, label: "Expense" },
  { key: "INCOME" as const, label: "Income" },
];

const DEFAULT_VALUES = (accounts: Account[]): TransactionFormValues => ({
  type: "EXPENSE",
  amount: "",
  category: "food",
  accountId: accounts[0]?.id ?? "",
  description: "",
  date: new Date(),
});

export default function AddTransactionScreen() {
  const { user } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();

  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    isError: accountsError,
  } = useAccountsQuery();
  const { mutateAsync: createTransaction, isPending: saving } =
    useCreateTransaction();

  const [error, setError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [inputMethod, setInputMethod] = useState<InputMethod>("MANUAL");
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset: resetForm,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES([]),
  });

  const type = watch("type");
  const category = watch("category");
  const accountId = watch("accountId");
  const date = watch("date");

  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (accounts.length > 0) resetForm(DEFAULT_VALUES(accounts));
  }, [accounts, resetForm]);

  const applyExtraction = (result: ExtractedTransaction) => {
    const categoryList =
      result.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const isValidCategory = (key: CategoryKey | null): key is CategoryKey =>
      !!key && categoryList.some((c) => c.key === key);

    if (result.type) setValue("type", result.type);
    if (isValidCategory(result.category)) setValue("category", result.category);
    if (result.amount != null) setValue("amount", String(result.amount));
    if (result.description) setValue("description", result.description);
    if (result.date) {
      const parsedDate = new Date(result.date);
      if (isValid(parsedDate) && parsedDate <= new Date()) {
        setValue("date", parsedDate);
      }
    }

    const missing = [
      result.amount == null && "amount",
      !isValidCategory(result.category) && "category",
    ].filter(Boolean);
    if (missing.length > 0) {
      Alert.alert(
        "Review before saving",
        `Couldn't confidently read the ${missing.join(" and ")}. Please fill it in.`,
      );
    }
  };

  const handleReceiptCaptured = async (base64: string, mimeType: string) => {
    setScannerOpen(false);
    setScanning(true);
    try {
      const extracted = await extractTransactionFromReceipt(base64, mimeType);
      applyExtraction(extracted);
      setInputMethod("RECEIPT_SCAN");
    } catch (err) {
      console.error("Receipt scan failed:", err);
      Alert.alert(
        "Error",
        "Couldn't read that receipt. Try again or enter it manually.",
      );
    } finally {
      setScanning(false);
    }
  };

  const handleVoiceExtracted = (result: ExtractedTransaction) => {
    applyExtraction(result);
    setVoiceTranscript(result.transcript);
    setInputMethod("VOICE");
  };

  useEffect(() => {
    if (params.action === "scan") {
      setScannerOpen(true);
      router.setParams({ action: undefined });
    } else if (params.action === "voice") {
      setVoiceModalOpen(true);
      router.setParams({ action: undefined });
    }
  }, [params.action, router]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user) return;

    setError("");

    const parsed = parseFloat(values.amount.replace(/,/g, ""));

    const { error: createError } = await createTransaction({
      user_id: user.id,
      account_id: values.accountId,
      type: values.type,
      amount: parsed,
      category: values.category,
      description: values.description?.trim() || null,
      date: values.date.toISOString(),
      input_method: inputMethod,
      voice_transcript: inputMethod === "VOICE" ? voiceTranscript : null,
    });

    if (createError) {
      setError("Something went wrong. Please try again.");
      return;
    }

    resetForm(DEFAULT_VALUES(accounts));
    setInputMethod("MANUAL");
    setVoiceTranscript(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(root)/(tabs)/transactions");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090B10]" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-full bg-[#171A22] border border-[#242832] items-center justify-center">
            <Feather name="plus-circle" size={18} color="#4A9EFF" />
          </View>

          <Text className="text-[#F5F7FA] text-xl font-semibold">
            Add Transaction
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {loadingAccounts ? (
          <View className="flex-1 items-center justify-center bg-[#090B10]">
            <ActivityIndicator color="#4A9EFF" />
          </View>
        ) : accountsError ? (
          <View className="flex-1 items-center justify-center px-10 bg-[#090B10]">
            <Feather name="alert-circle" size={32} color="#FF6B4A" />
            <Text className="text-[#717784] text-sm mt-3 text-center">
              Couldn&apos;t load your accounts.
            </Text>
          </View>
        ) : accounts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10 bg-[#090B10]">
            <Feather name="alert-circle" size={32} color="#FF6B4A" />
            <Text className="text-[#717784] text-sm mt-3 text-center">
              You need an account before adding a transaction.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="bg-[#090B10]"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 100,
            }}
          >
            {/* AI capture shortcuts */}
            <View className="flex-row gap-2.5 mb-4">
              <AIActionCard
                icon="camera"
                title="Scan receipt"
                subtitle="Snap a photo"
                colors={AI_GRADIENT}
                onPress={() => setScannerOpen(true)}
              />
              <AIActionCard
                icon="mic"
                title="Voice log"
                subtitle="Just say it"
                colors={AI_GRADIENT_REVERSE}
                onPress={() => setVoiceModalOpen(true)}
              />
            </View>

            {/* Type toggle */}
            <View className="flex-row bg-[#11141B] rounded-xl border border-[#242832] p-1 mb-4">
              {TYPE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => {
                    setValue("type", t.key);
                    setValue(
                      "category",
                      t.key === "INCOME"
                        ? INCOME_CATEGORIES[0].key
                        : EXPENSE_CATEGORIES[0].key,
                    );
                  }}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    type === t.key ? "bg-[#F5F7FA]" : ""
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      type === t.key ? "text-[#090B10]" : "text-[#8F96A3]"
                    }`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
              Amount
            </Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={(v) => {
                    setError("");
                    onChange(v);
                  }}
                  onBlur={onBlur}
                  placeholder="0"
                  placeholderTextColor="#717784"
                  keyboardType="numeric"
                  className="bg-[#11141B] border border-[#242832] rounded-xl px-4 py-3.5 text-sm text-[#F5F7FA]"
                />
              )}
            />
            {errors.amount && (
              <Text className="text-[#FF6B4A] text-xs mt-1.5">
                {errors.amount.message}
              </Text>
            )}
            <View className="mb-4" />

            {/* Category */}
            <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
              Category
            </Text>
            <View className="mb-4">
              <PillGroup
                options={categories.map((c) => ({
                  key: c.key,
                  label: c.label,
                  icon: c.icon,
                }))}
                value={category}
                onChange={(key) => setValue("category", key)}
              />
            </View>

            {/* Account */}
            <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
              Account
            </Text>
            <View className="mb-1">
              <PillGroup
                options={accounts.map((a) => ({ key: a.id, label: a.name }))}
                value={accountId}
                onChange={(key) => setValue("accountId", key)}
              />
            </View>
            {errors.accountId && (
              <Text className="text-[#FF6B4A] text-xs mb-3">
                {errors.accountId.message}
              </Text>
            )}
            <View className="mb-3" />

            {/* Date */}
            <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
              Date
            </Text>
            <TouchableOpacity
              onPress={() => setDatePickerOpen((v) => !v)}
              className="flex-row items-center justify-between bg-[#11141B] border border-[#242832] rounded-xl px-4 py-3.5 mb-1"
            >
              <Text className="text-sm text-[#F5F7FA]">
                {format(date, "d MMM yyyy")}
              </Text>
              <Feather name="calendar" size={16} color="#8F96A3" />
            </TouchableOpacity>

            {datePickerOpen && (
              <View className="bg-[#11141B] border border-[#242832] rounded-xl mb-4 overflow-hidden">
                <CalendarPicker
                  value={date}
                  maximumDate={new Date()}
                  onChange={(selectedDate) => {
                    setValue("date", selectedDate);
                    setDatePickerOpen(false);
                  }}
                />
              </View>
            )}
            {!datePickerOpen && <View className="mb-4" />}

            {/* Description */}
            <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
              Description (optional)
            </Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Swiggy order"
                  placeholderTextColor="#717784"
                  className="bg-[#11141B] border border-[#242832] rounded-xl px-4 py-3.5 mb-4 text-sm text-[#F5F7FA]"
                />
              )}
            />

            {error ? (
              <Text className="text-[#FF6B4A] text-xs mb-4">{error}</Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              className="bg-[#F5F7FA] rounded-xl py-4 items-center mb-2"
              activeOpacity={0.85}
            >
              <Text className="text-[#090B10] text-sm font-semibold">
                {saving ? "Saving…" : "Save transaction"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {scanning && (
        <View className="absolute inset-0 items-center justify-center bg-black/60">
          <View className="bg-[#11141B] border border-[#242832] rounded-2xl px-6 py-5 items-center">
            <ActivityIndicator color="#4A9EFF" />
            <Text className="text-[#F5F7FA] text-sm mt-3">
              Reading receipt…
            </Text>
          </View>
        </View>
      )}

      <VoiceRecorderModal
        visible={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onExtracted={handleVoiceExtracted}
      />

      <ReceiptScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCaptured={handleReceiptCaptured}
      />
    </SafeAreaView>
  );
}
