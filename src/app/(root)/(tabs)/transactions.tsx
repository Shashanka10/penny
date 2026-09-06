import { TransactionRow } from "@/components/TransactionRow";
import { useDeleteTransaction } from "@/hooks/mutations/useTransactionMutations";
import { useAccountsQuery } from "@/hooks/queries/useAccountsQuery";
import { useTransactionsQuery } from "@/hooks/queries/useTransactionsQuery";
import { Transaction, TransactionType } from "@/lib/services/transactions";
import { exportTransactionsToCsv } from "@/lib/utils/exportTransactions";
import { Feather } from "@expo/vector-icons";
import { eachDayOfInterval, format, startOfDay, startOfMonth } from "date-fns";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTERS = ["All", "Income", "Expense"] as const;

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function currentMonthDays() {
  const today = startOfDay(new Date());
  return eachDayOfInterval({ start: startOfMonth(today), end: today }).map(
    (d) => ({ key: dayKey(d), label: format(d, "d MMM") }),
  );
}

export default function TransactionsScreen() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]>("All");
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const typeFilter: TransactionType | null =
    activeFilter === "Income"
      ? "INCOME"
      : activeFilter === "Expense"
        ? "EXPENSE"
        : null;

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    isRefetching: transactionsRefetching,
    isError: transactionsError,
    refetch: refetchTransactions,
  } = useTransactionsQuery({ type: typeFilter, accountId: activeAccountId });
  const { data: accounts = [], refetch: refetchAccounts } = useAccountsQuery();
  const { mutateAsync: removeTransaction } = useDeleteTransaction();

  const loading = transactionsLoading;
  const refreshing = transactionsRefetching;
  const error = transactionsError;

  const loadData = () => {
    refetchTransactions();
    refetchAccounts();
  };

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q),
    );
  }, [transactions, search]);

  const dailyIncomeExpense = useMemo(() => {
    const days = currentMonthDays();
    return days.flatMap(({ key, label }) => {
      const income = transactions
        .filter(
          (tx) => tx.type === "INCOME" && dayKey(new Date(tx.date)) === key,
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
      const expense = transactions
        .filter(
          (tx) => tx.type === "EXPENSE" && dayKey(new Date(tx.date)) === key,
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
      return [
        { value: income, label, frontColor: "#3DDC84" },
        { value: expense, frontColor: "#FF6B4A" },
      ];
    });
  }, [transactions]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { count } = await exportTransactionsToCsv(transactions);
      if (count === 0) {
        Alert.alert(
          "Nothing to export",
          "No transactions in the export window.",
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
      Alert.alert("Error", "Couldn't export transactions.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      "Delete transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: deleteError } = await removeTransaction(tx);
            if (deleteError) {
              Alert.alert("Error", "Couldn't delete this transaction.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090B10]" edges={["top"]}>
      <View className="px-5 pt-3 pb-2 bg-[#090B10]">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-[#171A22] border border-[#242832] items-center justify-center">
                <Feather name="credit-card" size={18} color="#4A9EFF" />
              </View>

              <Text className="text-[#F5F7FA] text-xl font-semibold">
                Transactions
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            className="w-9 h-9 rounded-full bg-[#11141B] border border-[#242832] items-center justify-center"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#8F96A3" />
            ) : (
              <Feather name="download" size={15} color="#8F96A3" />
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 bg-[#11141B] rounded-xl border border-[#242832] px-3.5 py-2.5 mb-2.5">
          <Feather name="search" size={15} color="#717784" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions"
            placeholderTextColor="#717784"
            className="flex-1 text-xs text-[#F5F7FA]"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color="#717784" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row gap-2 mb-2.5">
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full border ${
                activeFilter === filter
                  ? "bg-[#F5F7FA] border-[#F5F7FA]"
                  : "bg-[#11141B] border-[#242832]"
              }`}
            >
              <Text
                className={`text-xs ${
                  activeFilter === filter ? "text-[#090B10]" : "text-[#8F96A3]"
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setActiveAccountId(null)}
              className={`px-3.5 py-1.5 rounded-full border ${
                activeAccountId === null
                  ? "bg-[#F5F7FA] border-[#F5F7FA]"
                  : "bg-[#11141B] border-[#242832]"
              }`}
            >
              <Text
                className={`text-xs ${
                  activeAccountId === null ? "text-[#090B10]" : "text-[#8F96A3]"
                }`}
              >
                All Accounts
              </Text>
            </TouchableOpacity>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                onPress={() => setActiveAccountId(account.id)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  activeAccountId === account.id
                    ? "bg-[#F5F7FA] border-[#F5F7FA]"
                    : "bg-[#11141B] border-[#242832]"
                }`}
              >
                <Text
                  className={`text-xs ${
                    activeAccountId === account.id
                      ? "text-[#090B10]"
                      : "text-[#8F96A3]"
                  }`}
                >
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#090B10]">
          <ActivityIndicator color="#4A9EFF" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10 bg-[#090B10]">
          <Feather name="alert-circle" size={32} color="#FF6B4A" />
          <Text className="text-[#717784] text-sm mt-3 text-center">
            Couldn&apos;t load transactions.
          </Text>
          <TouchableOpacity
            onPress={() => loadData()}
            className="mt-4 bg-[#F5F7FA] rounded-full px-4 py-2"
          >
            <Text className="text-[#090B10] text-xs font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow tx={item} onDelete={() => handleDelete(item)} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadData}
              tintColor="#4A9EFF"
              colors={["#4A9EFF"]}
            />
          }
          ListHeaderComponent={
            transactions.length > 0 ? (
              <View className="bg-[#11141B] rounded-2xl border border-[#242832] p-4 mb-4">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[#F5F7FA] text-xs font-medium">
                    Daily income vs expense
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-row items-center gap-1">
                      <View className="w-2 h-2 rounded-full bg-[#3DDC84]" />
                      <Text className="text-[10px] text-[#8F96A3]">Income</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <View className="w-2 h-2 rounded-full bg-[#FF6B4A]" />
                      <Text className="text-[10px] text-[#8F96A3]">
                        Expense
                      </Text>
                    </View>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={dailyIncomeExpense}
                    width={Math.max(dailyIncomeExpense.length * 9, 280)}
                    height={120}
                    barWidth={6}
                    spacing={4}
                    hideYAxisText
                    xAxisColor="#242832"
                    yAxisColor="transparent"
                    rulesColor="#242832"
                    noOfSections={3}
                    xAxisLabelTextStyle={{ color: "#717784", fontSize: 7 }}
                    isThreeD={false}
                    roundedTop
                  />
                </ScrollView>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={32} color="#4B5563" />
              <Text className="text-[#717784] text-sm mt-3">
                {search ? "No matching transactions" : "No transactions yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
