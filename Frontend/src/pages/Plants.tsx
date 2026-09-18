import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import PlantModal from "@/components/org/PlantModal";
import { useAuth } from "@/contexts/AuthContext";

interface Plant {
  id: string;
  name: string;
  code: string;
  location: string;
  _count?: { departments: number; users: number; files: number };
}

export default function Plants() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const canManagePlants = ["SUPER_ADMIN"].includes(user?.role || "");

  const fetchPlants = () => {
    setIsLoading(true);
    api
      .get("/plants?limit=1000")
      .then(({ data }) => setPlants(data.data.items))
      .catch(() => setError("Couldn't load plants."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const openAddModal = () => {
    setSelectedPlant(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Plants</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${plants.length} plants`}
          </p>
        </div>
        {canManagePlants && (
          <Button onClick={openAddModal} className="gap-2">
            <Plus className="h-4 w-4" /> Add Plant
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && plants.length === 0 && !error && (
        <div className="border rounded-lg p-12 text-center text-sm text-muted-foreground">
          No plants yet.
        </div>
      )}

      {!isLoading && plants.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="border rounded-lg p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-medium text-foreground">{plant.name}</h3>
                  <span className="text-xs text-muted-foreground block mb-2">{plant.code}</span>
                </div>
                {canManagePlants && (
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(plant)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{plant.location}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{plant._count?.departments ?? 0} departments</span>
                <span>{plant._count?.users ?? 0} people</span>
                <span>{plant._count?.files ?? 0} files</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {isModalOpen && (
        <PlantModal
          plant={selectedPlant}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchPlants();
          }}
        />
      )}
    </div>
  );
}