import { ALL_CURRENCIES, CurrencyPicker } from "@/components/CurrencyPicker";
import { useSupabase } from "@/hooks/useSupabase";
import {
  OnboardingFormValues,
  onboardingSchema,
} from "@/lib/schemas/onboarding";
import { useUserStore } from "@/store/userStore";
import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const { user } = useUser();
  const authSupabase = useSupabase();
  const setCurrency = useUserStore((s) => s.setCurrency);
  const setNeedsOnboarding = useUserStore((s) => s.setNeedsOnboarding);

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: { startingBalance: "" },
  });

  const [selectedCurrency, setSelectedCurrency] = useState(
    ALL_CURRENCIES.find((c) => c.code === "INR") ?? ALL_CURRENCIES[0],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async ({ startingBalance }: OnboardingFormValues) => {
    const parsed = parseFloat(startingBalance.replace(/,/g, ""));
    setSaving(true);
    setError("");

    const { error: updateError } = await authSupabase
      .from("users")
      .update({
        currency: selectedCurrency.code,
      })
      .eq("clerk_id", user!.id);

    if (updateError) {
      setSaving(false);
      setError("Something went wrong. Please try again.");
      return;
    }

    const { data: defaultAccount, error: accountFetchError } =
      await authSupabase
        .from("accounts")
        .select("id, balance")
        .eq("user_id", user!.id)
        .eq("is_default", true)
        .single();

    if (accountFetchError || !defaultAccount) {
      setSaving(false);
      setError("Something went wrong. Please try again.");
      return;
    }

    const { error: txError } = await authSupabase.from("transactions").insert({
      user_id: user!.id,
      account_id: defaultAccount.id,
      type: "INCOME",
      amount: parsed,
      category: "other_income",
      description: "Starting balance",
      date: new Date().toISOString(),
      input_method: "MANUAL",
    });

    if (txError) {
      setSaving(false);
      setError("Something went wrong. Please try again.");
      return;
    }

    const { error: balanceError } = await authSupabase
      .from("accounts")
      .update({ balance: defaultAccount.balance + parsed })
      .eq("id", defaultAccount.id);

    setSaving(false);

    if (balanceError) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setCurrency(selectedCurrency.code);
    setNeedsOnboarding(false);
    router.replace("/(root)/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090B10]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center -mt-16">
          <Image
            source={require("../../assets/images/remind.png")}
            className="w-32 h-14 mb-10"
            resizeMode="contain"
          />
          <Text className="text-[#F5F7FA] text-3xl font-bold mb-2">
            Let&apos;s get you set up
          </Text>
          <Text className="text-[#8F96A3] text-sm mb-10">
            A couple of quick details to personalise your experience.
          </Text>

          {/* Starting balance */}
          <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
            Starting balance
          </Text>
          <View className="flex-row items-center bg-[#11141B] border border-[#242832] rounded-xl px-4 mb-1">
            <Text className="text-[#8F96A3] text-sm mr-2">
              {selectedCurrency.symbol}
            </Text>
            <Controller
              control={control}
              name="startingBalance"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={(v) => {
                    setError("");
                    onChange(v);
                  }}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#717784"
                  keyboardType="numeric"
                  returnKeyType="done"
                  className="flex-1 py-3.5 text-sm text-[#F5F7FA]"
                />
              )}
            />
          </View>
          {formErrors.startingBalance && (
            <Text className="text-[#FF6B4A] text-xs mb-4">
              {formErrors.startingBalance.message}
            </Text>
          )}
          <View className="mb-4" />

          {/* Currency picker */}
          <Text className="text-[#F5F7FA] text-xs font-medium mb-1.5">
            Currency
          </Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            className="flex-row items-center justify-between bg-[#11141B] border border-[#242832] rounded-xl px-4 py-3.5 mb-6"
          >
            <Text className="text-sm text-[#F5F7FA]">
              {selectedCurrency.symbol} {selectedCurrency.code} —{" "}
              {selectedCurrency.name}
            </Text>
            <Feather name="chevron-down" size={16} color="#8F96A3" />
          </TouchableOpacity>

          {error ? (
            <Text className="text-[#FF6B4A] text-xs mb-4">{error}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit(handleSave)}
            disabled={saving}
            className="bg-[#F5F7FA] rounded-xl py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-[#090B10] text-sm font-semibold">
              {saving ? "Saving…" : "Get started"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CurrencyPicker
        visible={pickerOpen}
        selectedCode={selectedCurrency.code}
        onSelect={(currency) => {
          setSelectedCurrency(currency);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
