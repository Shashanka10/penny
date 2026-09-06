import { codeSchema, SignInFormValues, signInSchema } from "@/lib/schemas/auth";
import { useSignIn } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
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

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
  } = useForm<{ code: string }>({
    resolver: zodResolver(codeSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
    },
  });

  const isLoading = fetchStatus === "fetching";

  const onSignInPress = async (values: SignInFormValues) => {
    const { error } = await signIn.password({
      emailAddress: values.email,
      password: values.password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;

          const url = decorateUrl("/");
          router.replace(url as any);
        },
      });
    } else if (signIn.status === "needs_second_factor") {
      await signIn.mfa.sendPhoneCode();
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const onVerifyPress = async ({ code }: { code: string }) => {
    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;

          const url = decorateUrl("/");
          router.replace(url as any);
        },
      });
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  /*
   * -------------------------------------------------------
   * MFA / EMAIL VERIFICATION
   * -------------------------------------------------------
   */

  if (signIn.status === "needs_client_trust") {
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

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-[#1A1D26] text-center">
                Verify your account
              </Text>

              <Text className="text-brand-text-muted text-base text-center mt-3 leading-6">
                Enter the verification code sent to your email to continue.
              </Text>
            </View>

            {/* Verification Card */}
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

              {/* Verify */}
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
                  <Text className="text-white font-bold text-base">Verify</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="items-center mt-7">
              <TouchableOpacity
                onPress={() => signIn.mfa.sendEmailCode()}
                disabled={isLoading}
                activeOpacity={0.7}
                className="py-2"
              >
                <Text className="text-brand-blue font-semibold">
                  Didn't receive the code? Resend
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => signIn.reset()}
                activeOpacity={0.7}
                className="py-2 mt-1"
              >
                <Text className="text-brand-text-muted text-sm">
                  Use a different account
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
   * SIGN IN
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
        <View className="flex-1 px-6 pt-16 pb-10 justify-center">
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
              Welcome back
            </Text>

            <Text className="text-brand-text-muted text-base mt-2 text-center">
              Sign in to continue to Remind
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-3xl p-5 border border-[#E8E6DF]">
            {/* Email */}
            <Text className="text-[#1A1D26] font-semibold mb-3">
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

            {errors.fields.identifier && (
              <Text className="text-brand-coral mt-2 text-sm">
                {errors.fields.identifier.message}
              </Text>
            )}

            {/* Password */}
            <View className="flex-row items-center justify-between mt-5 mb-3">
              <Text className="text-[#1A1D26] font-semibold">Password</Text>

              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-brand-blue text-sm font-semibold">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  className="border border-[#E8E6DF] bg-[#FAFAF8] rounded-2xl px-4 py-4 text-[#1A1D26]"
                  placeholder="Enter your password"
                  placeholderTextColor="#9A9DA5"
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

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSignInPress)}
              disabled={isLoading}
              activeOpacity={0.8}
              className={`w-full py-4 rounded-2xl items-center mt-6 ${
                isLoading ? "bg-[#9CB5D9]" : "bg-brand-blue"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Sign in</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up */}
          <View className="flex-row justify-center mt-7">
            <Text className="text-brand-text-muted">
              Don't have an account?{" "}
            </Text>

            <Link href="/sign-up">
              <Text className="text-brand-blue font-bold">Create one</Text>
            </Link>
          </View>

          {/* Terms */}
          <Text className="text-center text-[#9A9DA5] text-xs leading-5 mt-6 px-5">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
