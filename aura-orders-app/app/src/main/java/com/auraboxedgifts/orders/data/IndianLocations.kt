package com.auraboxedgifts.orders.data

object IndianLocations {
    val states: List<String> = listOf(
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Andaman and Nicobar Islands",
        "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry"
    )

    private val citiesByState: Map<String, List<String>> = mapOf(
        "Delhi" to listOf(
            "New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi",
            "Central Delhi", "Shahdara", "Dwarka", "Rohini", "Saket"
        ),
        "Maharashtra" to listOf("Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"),
        "Karnataka" to listOf("Bengaluru", "Mysuru", "Mangalore", "Hubballi", "Belagavi"),
        "Tamil Nadu" to listOf("Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"),
        "Telangana" to listOf("Hyderabad", "Warangal", "Nizamabad", "Karimnagar"),
        "Gujarat" to listOf("Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"),
        "Rajasthan" to listOf("Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"),
        "Uttar Pradesh" to listOf("Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Agra"),
        "West Bengal" to listOf("Kolkata", "Howrah", "Durgapur", "Siliguri"),
        "Punjab" to listOf("Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"),
        "Haryana" to listOf("Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak"),
        "Kerala" to listOf("Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"),
        "Madhya Pradesh" to listOf("Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"),
        "Bihar" to listOf("Patna", "Gaya", "Muzaffarpur", "Bhagalpur"),
        "Andhra Pradesh" to listOf("Visakhapatnam", "Vijayawada", "Guntur", "Nellore"),
        "Assam" to listOf("Guwahati", "Silchar", "Dibrugarh", "Jorhat"),
        "Odisha" to listOf("Bhubaneswar", "Cuttack", "Rourkela", "Puri"),
        "Jharkhand" to listOf("Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"),
        "Chhattisgarh" to listOf("Raipur", "Bhilai", "Bilaspur", "Durg"),
        "Uttarakhand" to listOf("Dehradun", "Haridwar", "Rishikesh", "Nainital"),
        "Himachal Pradesh" to listOf("Shimla", "Dharamshala", "Manali", "Solan"),
        "Goa" to listOf("Panaji", "Margao", "Vasco da Gama", "Mapusa")
    )

    fun citiesForState(state: String): List<String> {
        if (state.isBlank()) return emptyList()
        citiesByState[state]?.let { return it }
        return listOf("Other")
    }

    fun normalizeState(value: String): String? =
        states.find { it.equals(value, ignoreCase = true) }
}
