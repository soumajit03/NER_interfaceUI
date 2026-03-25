import { useState } from "react"
import MainTabs from "./components/layout/MainTabs"
import NamedEntityPage from "./pages/NamedEntityPage"
import RelationshipPage from "./pages/RelationshipPage"
import EventEntityPage from "./pages/EventEntityPage"

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0)

  return (
    <div className="overlay">
      <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 0 && <NamedEntityPage />}
      {activeTab === 1 && <RelationshipPage />}
      {activeTab === 2 && <EventEntityPage />}
    </div>
  )
}