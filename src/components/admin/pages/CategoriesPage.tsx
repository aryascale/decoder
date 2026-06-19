import CategoryManager from "../../CategoryManager";

interface CategoriesPageProps {
  categories: string[];
  eventId: string;
  onConfigChanged: () => void;
  onCategoriesChange: (categories: string[]) => void;
}

export default function CategoriesPage({
  eventId,
  onConfigChanged,
  onCategoriesChange
}: CategoriesPageProps) {
  return (
    <>
      <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Category Management</h1>
      <CategoryManager
        eventId={eventId}
        onCategoriesChange={(newCats: string[]) => {
          onCategoriesChange(newCats);
          onConfigChanged();
        }}
      />
    </>
  );
}
