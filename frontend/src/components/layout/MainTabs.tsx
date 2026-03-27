interface Props {
  activeTab: number
  setActiveTab: (index: number) => void
}

export default function MainTabs({ activeTab, setActiveTab }: Props) {
  const tabs = [
    "Annotate",
    "History",
  ]

  return (
    <div className="tab-row">
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => setActiveTab(index)}
          className={activeTab === index ? "tab-btn active" : "tab-btn"}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}