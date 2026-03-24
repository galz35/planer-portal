
import React, { useState, useEffect } from 'react';
import { APP_MENU, ICON_MAP } from '../../constants/appMenu';
import { Check } from 'lucide-react';

interface MenuBuilderProps {
    initialJson: string;
    onChange: (json: string) => void;
}

export const MenuBuilder: React.FC<MenuBuilderProps> = ({ initialJson, onChange }) => {
    // Keep track of selected paths
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    // Provide feedback if JSON was manually corrupted before
    const [parseError, setParseError] = useState<string | null>(null);

    // Initialize from JSON prop
    useEffect(() => {
        if (!initialJson) {
            setSelectedPaths(new Set());
            return;
        }

        try {
            const parsed = JSON.parse(initialJson);
            const paths = new Set<string>();

            if (Array.isArray(parsed)) {
                parsed.forEach((group: any) => {
                    if (Array.isArray(group.items)) {
                        group.items.forEach((item: any) => {
                            if (item.path) paths.add(item.path);
                            // Also check children!
                            if (Array.isArray(item.children)) {
                                item.children.forEach((child: any) => {
                                    if (child.path) paths.add(child.path);
                                });
                            }
                        });
                    }
                });
            }
            setSelectedPaths(paths);
            setParseError(null);
        } catch (e) {
            console.error("Error parsing menu JSON:", e);
            setParseError("El menú actual tiene un formato inválido. Se reiniciará si guardas cambios.");
        }
    }, [initialJson]);

    // Handle Toggling a single item
    const toggleItem = (path: string) => {
        if (!path) return;
        const newPaths = new Set(selectedPaths);
        if (newPaths.has(path)) {
            newPaths.delete(path);
        } else {
            newPaths.add(path);
        }
        setSelectedPaths(newPaths);
        generateJson(newPaths);
    };

    const getGroupPaths = (group: any): string[] => {
        return group.items.flatMap((i: any) => i.children ? i.children.map((c: any) => c.path) : [i.path]).filter(Boolean) as string[];
    };

    // Handle Toggling a whole group
    const toggleGroup = (groupIndex: number) => {
        const group = APP_MENU[groupIndex];
        const groupPaths = getGroupPaths(group);
        if (groupPaths.length === 0) return;

        const allSelected = groupPaths.every(p => selectedPaths.has(p));
        const newPaths = new Set(selectedPaths);

        if (allSelected) {
            // Deselect all
            groupPaths.forEach(p => newPaths.delete(p));
        } else {
            // Select all
            groupPaths.forEach(p => newPaths.add(p));
        }

        setSelectedPaths(newPaths);
        generateJson(newPaths);
    };

    // Generate JSON structure based on selected paths AND original structure
    const generateJson = (paths: Set<string>) => {
        const result = APP_MENU.map((group: any) => {
            // Filter items that are selected
            const activeItems = group.items.map((item: any) => {
                if (item.children) {
                    const activeChildren = item.children.filter((child: any) => child.path && paths.has(child.path));
                    if (activeChildren.length === 0) return null;
                    return {
                        label: item.label,
                        icon: item.icon,
                        children: activeChildren.map((child: any) => ({
                            path: child.path,
                            label: child.label,
                            icon: child.icon
                        }))
                    };
                } else if (item.path && paths.has(item.path)) {
                    return {
                        path: item.path,
                        label: item.label,
                        icon: item.icon
                    };
                }
                return null;
            }).filter(Boolean); // Remove null items

            // Only include group if it has items
            if (activeItems.length === 0) return null;

            return {
                group: group.group,
                items: activeItems
            };
        }).filter(Boolean); // Remove null groups

        onChange(JSON.stringify(result, null, 2));
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {parseError && (
                <div className="p-3 bg-amber-50 text-amber-600 text-xs font-bold border-b border-amber-100">
                    ⚠️ {parseError}
                </div>
            )}

            <div className="max-h-[400px] overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {APP_MENU.map((group, gIndex) => {
                    const groupPaths = getGroupPaths(group);
                    if (groupPaths.length === 0) return null;

                    const selectedCount = groupPaths.filter(p => selectedPaths.has(p)).length;
                    const isAllSelected = selectedCount === groupPaths.length;
                    const isIndeterminate = selectedCount > 0 && !isAllSelected;

                    return (
                        <div key={group.group} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <div
                                className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => toggleGroup(gIndex)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        w-5 h-5 rounded border flex items-center justify-center transition-all
                                        ${isAllSelected ? 'bg-indigo-600 border-indigo-600' : isIndeterminate ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-300'}
                                    `}>
                                        {isAllSelected && <Check size={12} className="text-white" />}
                                        {isIndeterminate && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm">{group.group}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                    {selectedCount}/{groupPaths.length}
                                </span>
                            </div>

                            {/* Group Items */}
                            <div className="divide-y divide-slate-50">
                                {group.items.flatMap((item: any) => {
                                    const renderableItems = item.children ? item.children : [item];
                                    return renderableItems.map((subItem: any) => {
                                        if (!subItem.path) return null;
                                        const Icon = ICON_MAP[(subItem.icon || item.icon) as string];
                                        const isSelected = selectedPaths.has(subItem.path);

                                        return (
                                            <div
                                                key={subItem.path}
                                                className={`
                                                    flex items-center gap-3 p-3 pl-10 cursor-pointer transition-all
                                                    ${isSelected ? 'bg-indigo-50/10' : 'hover:bg-slate-50'}
                                                `}
                                                onClick={() => toggleItem(subItem.path!)}
                                            >
                                                <div className={`
                                                    w-4 h-4 rounded border flex items-center justify-center transition-all
                                                    ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-200'}
                                                `}>
                                                    {isSelected && <Check size={10} className="text-white" />}
                                                </div>

                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {Icon && <Icon size={14} className={isSelected ? 'text-indigo-500' : 'text-slate-400'} />}
                                                    <span className={`text-xs ${isSelected ? 'font-bold text-slate-800' : 'font-medium'}`}>
                                                        {item.children ? `${item.label} / ${subItem.label}` : subItem.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-3 bg-slate-100 text-[10px] text-center text-slate-400 font-medium border-t border-slate-200">
                Selecciona las opciones visibles para este rol/usuario.
            </div>
        </div>
    );
};

