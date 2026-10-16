import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

function TabGlyph({
  color,
  name,
}: {
  color: string;
  name: "overview" | "charts" | "studio";
}) {
  return (
    <Svg height={22} viewBox="0 0 22 22" width={22}>
      {name === "overview" && (
        <>
          <Path
            d="M3.5 16.5 8 12l3 2.5 6.5-7"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
          <Circle cx={17.5} cy={7.5} fill={color} r={1.4} />
          <Line
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.5}
            x1={3.5}
            x2={18.5}
            y1={19}
            y2={19}
          />
        </>
      )}
      {name === "charts" && (
        <>
          <Rect
            fill="none"
            height={6}
            rx={1.3}
            stroke={color}
            strokeWidth={1.5}
            width={6}
            x={3.5}
            y={3.5}
          />
          <Rect
            fill="none"
            height={6}
            rx={1.3}
            stroke={color}
            strokeWidth={1.5}
            width={6}
            x={12.5}
            y={3.5}
          />
          <Rect
            fill="none"
            height={6}
            rx={1.3}
            stroke={color}
            strokeWidth={1.5}
            width={6}
            x={3.5}
            y={12.5}
          />
          <Rect
            fill="none"
            height={6}
            rx={1.3}
            stroke={color}
            strokeWidth={1.5}
            width={6}
            x={12.5}
            y={12.5}
          />
        </>
      )}
      {name === "studio" && (
        <>
          <Line
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.7}
            x1={5}
            x2={17}
            y1={6}
            y2={6}
          />
          <Line
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.7}
            x1={5}
            x2={17}
            y1={11}
            y2={11}
          />
          <Line
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.7}
            x1={5}
            x2={17}
            y1={16}
            y2={16}
          />
          <Circle
            cx={9}
            cy={6}
            fill="white"
            r={2}
            stroke={color}
            strokeWidth={1.5}
          />
          <Circle
            cx={14}
            cy={11}
            fill="white"
            r={2}
            stroke={color}
            strokeWidth={1.5}
          />
          <Circle
            cx={8}
            cy={16}
            fill="white"
            r={2}
            stroke={color}
            strokeWidth={1.5}
          />
        </>
      )}
    </Svg>
  );
}

export default function TabLayout() {
  const dark = useColorScheme() === "dark";
  const accent = dark ? "#83b4da" : "#3d78aa";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: dark ? "#8b8b96" : "#7e7c88",
        tabBarStyle: {
          backgroundColor: dark ? "#15141b" : "#ffffff",
          borderTopColor: dark ? "#292732" : "#ebe9f1",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <TabGlyph color={String(color)} name="overview" />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: "Charts",
          tabBarIcon: ({ color }) => (
            <TabGlyph color={String(color)} name="charts" />
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: "Studio",
          tabBarIcon: ({ color }) => (
            <TabGlyph color={String(color)} name="studio" />
          ),
        }}
      />
    </Tabs>
  );
}
