interface Props {
  activeTab: number
  setActiveTab: (index: number) => void
}

export default function MainTabs({ activeTab, setActiveTab }: Props) {
  const tabs = [
    "Named Entity Annotation",
    "Relationship Annotation",
    // "Event Entity Annotation",
  ]

  return (
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => setActiveTab(index)}
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            background: activeTab === index ? "#2d89ef" : "#444",
            color: "white",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}