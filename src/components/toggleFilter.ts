const toggleFilter = (categoryState: string[], setCategoryState: Dispatch<SetStateAction<string[]>>): ToggleFilterFunction => 
  (id: string, parentId?: string): void => {
    let newState = [...categoryState];
    
    if (categoryState.includes(id)) {
      // Remove the selected item
      newState = newState.filter(item => item !== id);
      
      // If a parent is deselected, also deselect all its children
      const allOptions = [
        ...accommodationOptions,
        ...natureAdventureOptions,
        ...relaxWellnessOptions,
        ...foodOptions,
        ...drinksNightlifeOptions
      ];
      const parent = allOptions.find(opt => opt.id === id);
      
      if (parent?.subcategories) {
        const childIds = parent.subcategories.map(sub => sub.id);
        newState = newState.filter(item => !childIds.includes(item));
      }
    } else {
      // Add the selected item
      newState.push(id);
    }
    
    setCategoryState(newState);
    notifyFilterChange();
  };
