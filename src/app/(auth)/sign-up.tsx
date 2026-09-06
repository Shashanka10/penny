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
   * ======================================================
   * EMAIL VERIFICATION
   * ======================================================
   */

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-brand-bg"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-12">
            {/* Logo */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-[26px] bg-brand-surface items-center justify-center border border-brand-border">
                <Image
                  source={require("../../assets/images/remind.png")}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Header */}
            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-brand-text-primary">
                Verify your account
              </Text>

              <Text className="text-brand-text-secondary text-base text-center mt-3 leading-6 px-5">
                We sent a verification code to
              </Text>

              <Text className="text-brand-text-primary font-semibold text-base mt-1">
                {email}
              </Text>
            </View>

            {/* Verification Card */}
            <View className="bg-brand-surface rounded-[28px] p-5 border border-brand-border">
              <Text className="text-brand-text-primary font-semibold mb-3">
                Verification code
              </Text>

              <Controller
                control={codeControl}
                name="code"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="border border-brand-border bg-brand-bg rounded-2xl px-4 py-5 text-brand-text-primary text-center text-xl tracking-[7px]"
                    placeholder="000000"
                    placeholderTextColor="#555B66"
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
                  isLoading ? "bg-brand-blue/40" : "bg-brand-blue"
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Verify email
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Verification Actions */}
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
                  Start over
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /*
   * ======================================================
   * SIGN UP
   * ======================================================
   */

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-brand-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 py-12 justify-center">
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-[26px] bg-brand-surface items-center justify-center border border-brand-border">
              <Image
                source={require("../../assets/images/remind.png")}
                className="w-16 h-16"
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-brand-text-primary">
              Create your account
            </Text>

            <Text className="text-brand-text-secondary text-base text-center mt-2">
              Start managing your money with Remind
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-brand-surface rounded-[28px] p-5 border border-brand-border">
            {/* Name */}
            <Text className="text-brand-text-primary font-semibold mb-3">
              Your name
            </Text>

            <View className="flex-row gap-3">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="flex-1 border border-brand-border bg-brand-bg rounded-2xl px-4 py-4 text-brand-text-primary"
                    placeholder="First name"
                    placeholderTextColor="#666C77"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="flex-1 border border-brand-border bg-brand-bg rounded-2xl px-4 py-4 text-brand-text-primary"
                    placeholder="Last name"
                    placeholderTextColor="#666C77"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    autoCorrect={false}
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
            <Text className="text-brand-text-primary font-semibold mt-5 mb-3">
              Email address
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  className="border border-brand-border bg-brand-bg rounded-2xl px-4 py-4 text-brand-text-primary"
                  placeholder="you@example.com"
                  placeholderTextColor="#666C77"
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
            <Text className="text-brand-text-primary font-semibold mt-5 mb-3">
              Password
            </Text>

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  className="border border-brand-border bg-brand-bg rounded-2xl px-4 py-4 text-brand-text-primary"
                  placeholder="Create a strong password"
                  placeholderTextColor="#666C77"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
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

            {/* Password hint */}
            <Text className="text-brand-text-muted text-xs mt-2">
              Use a combination of letters, numbers, and symbols.
            </Text>

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSignUpPress)}
              disabled={isLoading}
              activeOpacity={0.8}
              className={`w-full py-4 rounded-2xl items-center mt-6 ${
                isLoading ? "bg-brand-blue/40" : "bg-brand-blue"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Create account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign In */}
          <View className="flex-row justify-center mt-7">
            <Text className="text-brand-text-secondary">
              Already have an account?{" "}
            </Text>

            <Link href="/sign-in">
              <Text className="text-brand-blue font-bold">Sign in</Text>
            </Link>
          </View>

          {/* Terms */}
          <Text className="text-center text-brand-text-muted text-xs leading-5 mt-6 px-5">
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
