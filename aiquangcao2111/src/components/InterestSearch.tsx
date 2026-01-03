import { useState, useEffect, useRef } from "react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, TrendingUp } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import type { Interest } from "@/types";
import * as facebookService from "@/services/facebook";

interface InterestSearchProps {
  accessToken: string;
  selectedInterests: Interest[];
  onInterestChange: (interests: Interest[]) => void;
}

const InterestSearch = ({ accessToken, selectedInterests, onInterestChange }: InterestSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search interests from Facebook API
  const searchInterests = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await facebookService.searchTargetingInterests(query, accessToken);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search interests:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search - wait for user to stop typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        searchInterests(searchQuery.trim());
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 1000); // 1 second delay after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addInterest = (interest: Interest) => {
    // Check if already added
    if (selectedInterests.some(i => i.id === interest.id)) {
      return;
    }
    
    onInterestChange([...selectedInterests, interest]);
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeInterest = (interestId: string) => {
    onInterestChange(selectedInterests.filter(i => i.id !== interestId));
  };

  return (
    <div className="space-y-2">
      <Label>Sở thích</Label>
      
      <div ref={searchRef} className="relative">
        <Command className="border rounded-md" shouldFilter={false}>
          <CommandInput 
            placeholder="Tìm kiếm sở thích..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            onFocus={() => searchQuery.trim().length >= 2 && searchResults.length > 0 && setShowResults(true)}
          />
          {showResults && (
            <CommandList className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-popover shadow-md">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Đang tìm kiếm...</div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>
                  {searchQuery.length >= 2 ? "Không tìm thấy sở thích phù hợp" : "Nhập ít nhất 2 ký tự"}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {searchResults.map((interest) => (
                    <CommandItem
                      key={interest.id}
                      onSelect={() => addInterest(interest)}
                      disabled={selectedInterests.some(i => i.id === interest.id)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{interest.name}</div>
                        {interest.audience_size && (
                          <div className="text-xs text-muted-foreground">
                            Kích thước đối tượng: {interest.audience_size.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>

      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedInterests.map((interest) => (
            <Badge key={interest.id} variant="secondary" className="pr-1">
              {interest.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-2"
                onClick={() => removeInterest(interest.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterestSearch;
