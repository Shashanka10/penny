import {
  codeFormValues,
  codeSchema,
  SignUpFormValues,
  signUpSchema,
} from "@/lib/schemas/auth";
import { useAuth, useSignUp } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const isLoading = fetchStatus === "fetching";

  const [email, setEmail] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
  } = useForm<codeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
    mode: "onBlur",
  });

  const onSignUpPress = async (values: SignUpFormValues) => {
    setEmail(values.email);

    const { error } = await signUp.password({
      emailAddress: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    await signUp.verifications.sendEmailCode();
  };

  const onVerifyPress = async ({ code }: { code: string }) => {
    await signUp.verifications.verifyEmailCode({ code });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;

          const url = decorateUrl("/");
          router.replace(url as any);
        },
      });
    } else {
      console.error("Sign-up attempt not complete:", signUp);
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  /*
   * -------------------------------------------------------
   * EMAIL VERIFICATION SCREEN
   * -------------------------------------------------------
   */
  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-brand-body"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-12">
            {/* Logo */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-3xl bg-white items-center justify-center shadow-sm">
                <Image
                  source={require("../assets/images/remind.png")}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Heading */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-[#1A1D26] text-center">
                Verify your email
              </Text>

              <Text className="text-brand-text-muted text-base text-center mt-3 leading-6">
                We sent a verification code to
              </Text>

              <Text className="text-[#1A1D26] font-semibold text-center mt-1">
                {email}
              </Text>
            </View>

            {/* Card */}
            <View className="bg-white rounded-3xl p-5 border border-[#E8E6DF]">
              <Text className="text-[#1A1D26] font-semibold mb-3">
                Verification code
              </Text>

              <Controller
                control={codeControl}
                name="code"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26] text-center text-lg tracking-[6px]"
                    placeholder="000000"
                    placeholderTextColor="#B0B2B8"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                )}
              />

              {codeErrors.code && (
                <Text className="text-brand-coral mt-2 text-sm">
                  {codeErrors.code.message}
                </Text>
              )}

              {errors.fields.code && (
                <Text className="text-brand-coral mt-2 text-sm">
                  {errors.fields.code.message}
                </Text>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                onPress={handleCodeSubmit(onVerifyPress)}
                disabled={isLoading}
                activeOpacity={0.8}
                className={`w-full py-4 rounded-2xl items-center mt-5 ${
                  isLoading ? "bg-[#9CB5D9]" : "bg-brand-blue"
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Verify email
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="items-center mt-7">
              <TouchableOpacity
                onPress={() => signUp.verifications.sendEmailCode()}
                disabled={isLoading}
                activeOpacity={0.7}
                className="py-2"
              >
                <Text className="text-brand-blue font-semibold">
                  Didn't receive the code? Resend
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => signUp.reset()}
                activeOpacity={0.7}
                className="py-2 mt-1"
              >
                <Text className="text-brand-text-muted text-sm">
                  Use a different email
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /*
   * -------------------------------------------------------
   * SIGN UP SCREEN
   * -------------------------------------------------------
   */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-brand-body"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pt-16 pb-10">
          {/* Header */}
          <View className="items-center mb-9">
            <View className="w-20 h-20 rounded-3xl bg-white items-center justify-center mb-5 shadow-sm">
              <Image
                source={require("../assets/images/remind.png")}
                className="w-16 h-16"
                resizeMode="contain"
              />
            </View>

            <Text className="text-3xl font-bold text-[#1A1D26]">
              Create account
            </Text>

            <Text className="text-brand-text-muted text-base mt-2 text-center">
              Track your money, powered by AI
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-3xl p-5 border border-[#E8E6DF]">
            {/* Name */}
            <Text className="text-[#1A1D26] font-semibold mb-3">Your name</Text>

            <View className="flex-row gap-3">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="flex-1 border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26]"
                    placeholder="First name"
                    placeholderTextColor="#9A9DA5"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                  />
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="flex-1 border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26]"
                    placeholder="Last name"
                    placeholderTextColor="#9A9DA5"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                  />
                )}
              />
            </View>

            {(formErrors.firstName || formErrors.lastName) && (
              <Text className="text-brand-coral mt-2 text-sm">
                {formErrors.firstName?.message || formErrors.lastName?.message}
              </Text>
            )}

            {/* Email */}
            <Text className="text-[#1A1D26] font-semibold mt-5 mb-3">
              Email address
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  className="border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26]"
                  placeholder="you@example.com"
                  placeholderTextColor="#9A9DA5"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoComplete="email"
                />
              )}
            />

            {formErrors.email && (
              <Text className="text-brand-coral mt-2 text-sm">
                {formErrors.email.message}
              </Text>
            )}

            {errors.fields.emailAddress && (
              <Text className="text-brand-coral mt-2 text-sm">
                {errors.fields.emailAddress.message}
              </Text>
            )}

            {/* Password */}
            <Text className="text-[#1A1D26] font-semibold mt-5 mb-3">
              Password
            </Text>

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  className="border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26]"
                  placeholder="Create a password"
                  placeholderTextColor="#9A9DA5"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
            />

            {formErrors.password && (
              <Text className="text-brand-coral mt-2 text-sm">
                {formErrors.password.message}
              </Text>
            )}

            {errors.fields.password && (
              <Text className="text-brand-coral mt-2 text-sm">
                {errors.fields.password.message}
              </Text>
            )}

            {/* Sign Up */}
            <TouchableOpacity
              onPress={handleSubmit(onSignUpPress)}
              disabled={isLoading}
              activeOpacity={0.8}
              className={`w-full py-4 rounded-2xl items-center mt-6 ${
                isLoading ? "bg-[#9CB5D9]" : "bg-brand-blue"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Create account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login */}
          <View className="flex-row justify-center mt-7">
            <Text className="text-brand-text-muted">
              Already have an account?{" "}
            </Text>

            <Link href="/sign-in">
              <Text className="text-brand-blue font-bold">Sign in</Text>
            </Link>
          </View>

          {/* Terms */}
          <Text className="text-center text-[#9A9DA5] text-xs leading-5 mt-6 px-5">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </Text>

          {/* Required by Clerk for bot protection */}
          <View nativeID="clerk-captcha" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
