export type Location = 'local' | 'domicilio'

export type Service = {
  name: string
  duration: number
  price: number
}

export type BookingState = {
  step: number
  location: Location | null
  service: Service | null
  date: Date | null
  time: string | null
  nombre: string
  email: string
  whatsapp: string
  direccion: string
  nota: string
}
