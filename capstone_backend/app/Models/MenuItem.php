<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name',
        'description',
        'category',
        'price',
        'stock_quantity',
        'low_stock_threshold',
        'is_active',
        'image_path'
    ];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryLogs()
    {
        return $this->hasMany(InventoryLog::class);
    }
}
